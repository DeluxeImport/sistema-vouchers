import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../db.js";
import { config, CATEGORIAS, type Categoria } from "../config.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { procesarYGuardar, rutaAbsolutaVoucher } from "../services/voucherService.js";
import { audit, getIp } from "../utils/audit.js";

const router = Router();

// Filtro base segun el usuario: el admin ve todo; el usuario normal solo
// ve SUS vouchers y unicamente de las categorias que tiene permitidas.
function scopeBase(req: any): any {
  const u = req.usuario!;
  if (u.esAdmin) return {};
  return { usuarioId: u.sub, categoria: { in: u.categorias } };
}

// Categorias visibles para el usuario (admin = todas).
function categoriasVisibles(req: any): readonly Categoria[] {
  const u = req.usuario!;
  return u.esAdmin ? CATEGORIAS : u.categorias;
}

const MIMES_VALIDOS = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (MIMES_VALIDOS.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Formato no permitido. Use JPG, PNG, WEBP o HEIC."));
  },
});

// POST /api/vouchers/upload  (multipart, campo "imagenes", hasta 5)
router.post("/upload", requireAuth, upload.array("imagenes", 5), async (req, res) => {
  if (!req.usuario!.puedeSubir) {
    return res.status(403).json({ error: "No tienes permiso para subir" });
  }
  const categoria = String(req.body.categoria ?? "").toUpperCase() as Categoria;
  if (!CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ error: "Categoria invalida" });
  }
  if (!req.usuario!.esAdmin && !req.usuario!.categorias.includes(categoria)) {
    return res.status(403).json({ error: "No tienes permiso para esta categoria" });
  }
  const archivos = (req.files as Express.Multer.File[]) ?? [];
  if (archivos.length === 0) return res.status(400).json({ error: "Debe subir al menos una imagen" });

  const usuarioId = req.usuario!.sub;
  const ip = getIp(req);
  const resultados = [];
  for (const a of archivos) {
    const r = await procesarYGuardar(
      { buffer: a.buffer, mimetype: a.mimetype, size: a.size },
      categoria,
      usuarioId,
      ip
    );
    resultados.push(r);
  }
  await audit(req, "UPLOAD", usuarioId, `${resultados.length} voucher(s) ${categoria}: ${resultados.map((r) => r.voucherId).join(", ")}`);
  return res.status(201).json({ vouchers: resultados });
});

// GET /api/vouchers  (filtros + paginacion)
const listQuerySchema = z.object({
  categoria: z.string().optional(),
  usuario_id: z.string().optional(),
  fecha_desde: z.string().optional(),
  fecha_hasta: z.string().optional(),
  voucher_id: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
router.get("/", requireAuth, async (req, res) => {
  if (!req.usuario!.puedeVerGaleria) {
    return res.status(403).json({ error: "No tienes permiso para ver la galeria" });
  }
  const parse = listQuerySchema.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: "Parametros invalidos" });
  const q = parse.data;

  const where: any = scopeBase(req);
  if (q.categoria && q.categoria.toUpperCase() !== "TODAS") {
    const cat = q.categoria.toUpperCase() as Categoria;
    // Respetamos el scope: si pide una categoria no permitida, no devuelve nada.
    if (req.usuario!.esAdmin || req.usuario!.categorias.includes(cat)) where.categoria = cat;
    else where.categoria = "__none__";
  }
  if (q.usuario_id && req.usuario!.esAdmin) where.usuarioId = q.usuario_id;
  if (q.voucher_id) where.voucherId = { contains: q.voucher_id.toUpperCase() };
  if (q.fecha_desde || q.fecha_hasta) {
    where.fechaCarga = {};
    if (q.fecha_desde) where.fechaCarga.gte = new Date(q.fecha_desde + "T00:00:00");
    if (q.fecha_hasta) where.fechaCarga.lte = new Date(q.fecha_hasta + "T23:59:59");
  }

  const total = await prisma.voucher.count({ where });
  const items = await prisma.voucher.findMany({
    where,
    orderBy: { fechaCarga: "desc" },
    skip: (q.page - 1) * q.limit,
    take: q.limit,
    include: { usuario: { select: { id: true, nombre: true, username: true } } },
  });

  return res.json({
    items,
    total,
    page: q.page,
    limit: q.limit,
    totalPaginas: Math.ceil(total / q.limit),
  });
});

// GET /api/vouchers/stats  (resumen general, segun el scope del usuario)
router.get("/stats", requireAuth, async (req, res) => {
  if (!req.usuario!.puedeVerDashboard) {
    return res.status(403).json({ error: "No tienes permiso para ver el dashboard" });
  }
  const base = scopeBase(req);
  const total = await prisma.voucher.count({ where: base });
  const porCategoria: Record<string, number> = {};
  for (const cat of categoriasVisibles(req)) {
    porCategoria[cat] = await prisma.voucher.count({ where: { ...base, categoria: cat } });
  }
  const recientes = await prisma.voucher.findMany({
    where: base,
    orderBy: { fechaCarga: "desc" },
    take: 10,
    include: { usuario: { select: { id: true, nombre: true, username: true } } },
  });
  return res.json({ total, porCategoria, recientes });
});

// GET /api/vouchers/stats/by-user  (solo admin)
router.get("/stats/by-user", requireAuth, requireAdmin, async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({ select: { id: true, nombre: true, username: true } });
  const resultado = [];
  for (const u of usuarios) {
    const total = await prisma.voucher.count({ where: { usuarioId: u.id } });
    const porCategoria: Record<string, number> = {};
    for (const cat of CATEGORIAS) {
      porCategoria[cat] = await prisma.voucher.count({ where: { usuarioId: u.id, categoria: cat } });
    }
    const ultimo = await prisma.voucher.findFirst({
      where: { usuarioId: u.id },
      orderBy: { fechaCarga: "desc" },
      select: { fechaCarga: true },
    });
    resultado.push({ ...u, total, porCategoria, ultimoVoucher: ultimo?.fechaCarga ?? null });
  }
  return res.json({ usuarios: resultado });
});

// GET /api/vouchers/stats/by-month  (ultimos 12 meses)
router.get("/stats/by-month", requireAuth, async (req, res) => {
  if (!req.usuario!.puedeVerDashboard) {
    return res.status(403).json({ error: "No tienes permiso para ver el dashboard" });
  }
  const categoria = req.query.categoria ? String(req.query.categoria).toUpperCase() : undefined;
  const where: any = scopeBase(req);
  if (categoria && categoria !== "TODAS") {
    const cat = categoria as Categoria;
    if (req.usuario!.esAdmin || req.usuario!.categorias.includes(cat)) where.categoria = cat;
    else where.categoria = "__none__";
  }

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 11);
  desde.setDate(1);
  desde.setHours(0, 0, 0, 0);
  where.fechaCarga = { gte: desde };

  const vouchers = await prisma.voucher.findMany({ where, select: { fechaCarga: true } });
  const meses: { mes: string; total: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(desde);
    d.setMonth(desde.getMonth() + i);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ mes: clave, total: 0 });
  }
  for (const v of vouchers) {
    const clave = `${v.fechaCarga.getFullYear()}-${String(v.fechaCarga.getMonth() + 1).padStart(2, "0")}`;
    const m = meses.find((x) => x.mes === clave);
    if (m) m.total++;
  }
  return res.json({ meses });
});

// Verifica que el usuario pueda acceder a un voucher concreto.
function puedeAcceder(req: any, voucher: { usuarioId: string; categoria: string }): boolean {
  const u = req.usuario!;
  if (u.esAdmin) return true;
  return voucher.usuarioId === u.sub && u.categorias.includes(voucher.categoria as Categoria);
}

// GET /api/vouchers/:id
router.get("/:id", requireAuth, async (req, res) => {
  const voucher = await prisma.voucher.findUnique({
    where: { voucherId: req.params.id.toUpperCase() },
    include: { usuario: { select: { id: true, nombre: true, username: true } } },
  });
  if (!voucher) return res.status(404).json({ error: "Voucher no encontrado" });
  if (!puedeAcceder(req, voucher)) return res.status(404).json({ error: "Voucher no encontrado" });
  return res.json(voucher);
});

// GET /api/vouchers/:id/image
router.get("/:id/image", requireAuth, async (req, res) => {
  const voucher = await prisma.voucher.findUnique({ where: { voucherId: req.params.id.toUpperCase() } });
  if (!voucher) return res.status(404).json({ error: "Voucher no encontrado" });
  if (!puedeAcceder(req, voucher)) return res.status(404).json({ error: "Voucher no encontrado" });
  const ruta = rutaAbsolutaVoucher(voucher.rutaArchivo);
  if (!fs.existsSync(ruta)) return res.status(404).json({ error: "Archivo no encontrado" });
  if (req.query.download) {
    if (!req.usuario!.puedeDescargar) return res.status(403).json({ error: "No tienes permiso para descargar" });
    return res.download(ruta, voucher.nombreArchivo);
  }
  return res.sendFile(ruta);
});

export default router;
