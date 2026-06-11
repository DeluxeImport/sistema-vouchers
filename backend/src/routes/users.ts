import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { hashPassword } from "../services/authService.js";
import { categoriasACsv, ROL_ADMIN } from "../utils/permisos.js";
import { audit } from "../utils/audit.js";

const router = Router();

// Calcula el siguiente id USRxxx.
async function siguienteId(): Promise<string> {
  const usuarios = await prisma.usuario.findMany({ select: { id: true } });
  let max = 0;
  for (const u of usuarios) {
    const m = /^USR(\d+)$/.exec(u.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `USR${String(max + 1).padStart(3, "0")}`;
}

// GET /api/users  (para selectores). Admin: todos. Normal: solo el mismo.
router.get("/", requireAuth, async (req, res) => {
  if (!req.usuario!.esAdmin) {
    return res.json({ usuarios: [{ id: req.usuario!.sub, nombre: req.usuario!.username, username: req.usuario!.username }] });
  }
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, username: true },
    orderBy: { id: "asc" },
  });
  return res.json({ usuarios });
});

// GET /api/users/admin/list  (gestion completa, solo admin)
router.get("/admin/list", requireAuth, requireAdmin, async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true, nombre: true, username: true, rol: true,
      categoriasPermitidas: true, puedeSubir: true, puedeVerGaleria: true,
      puedeVerDashboard: true, puedeDescargar: true, debeCambiar: true,
      totpActivo: true, ultimoAcceso: true, bloqueadoHasta: true, creadoEn: true,
    },
  });
  const conConteo = await Promise.all(
    usuarios.map(async (u) => ({
      ...u,
      categorias: u.categoriasPermitidas ? u.categoriasPermitidas.split(",").filter(Boolean) : [],
      totalVouchers: await prisma.voucher.count({ where: { usuarioId: u.id } }),
    }))
  );
  return res.json({ usuarios: conConteo });
});

// POST /api/users  (crear usuario, solo admin)
const crearSchema = z.object({
  nombre: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
  username: z
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .regex(/^[a-zA-Z0-9_.]+$/, "El nombre de usuario solo admite letras, numeros, punto y guion bajo (sin espacios ni acentos)"),
  rol: z.enum(["USUARIO", "ADMIN"]).default("USUARIO"),
  categorias: z.array(z.string()).optional(),
  puedeSubir: z.boolean().default(true),
  puedeVerGaleria: z.boolean().default(true),
  puedeVerDashboard: z.boolean().default(true),
  puedeDescargar: z.boolean().default(true),
});
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const parse = crearSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos", detalles: parse.error.issues.map((i) => i.message) });
  const b = parse.data;

  const username = b.username.toLowerCase();
  const existe = await prisma.usuario.findUnique({ where: { username } });
  if (existe) return res.status(409).json({ error: "El nombre de usuario ya existe" });

  const id = await siguienteId();
  const passwordTemporal = `Voucher2024_${username}`;
  const passwordHash = await hashPassword(passwordTemporal);
  const esAdminNuevo = b.rol === ROL_ADMIN;

  await prisma.usuario.create({
    data: {
      id, nombre: b.nombre, username, passwordHash, rol: b.rol,
      categoriasPermitidas: esAdminNuevo ? null : categoriasACsv(b.categorias ?? []),
      puedeSubir: b.puedeSubir,
      puedeVerGaleria: b.puedeVerGaleria,
      puedeVerDashboard: b.puedeVerDashboard,
      puedeDescargar: b.puedeDescargar,
      debeCambiar: true,
      totpActivo: false,
    },
  });
  await audit(req, "USER_CREATE", req.usuario!.sub, `creo ${id} (${username})`);
  return res.status(201).json({ id, username, passwordTemporal });
});

// PATCH /api/users/:id  (actualizar permisos/rol/categorias, solo admin)
const editarSchema = z.object({
  nombre: z.string().min(2).optional(),
  rol: z.enum(["USUARIO", "ADMIN"]).optional(),
  categorias: z.array(z.string()).optional(),
  puedeSubir: z.boolean().optional(),
  puedeVerGaleria: z.boolean().optional(),
  puedeVerDashboard: z.boolean().optional(),
  puedeDescargar: z.boolean().optional(),
});
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const parse = editarSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const b = parse.data;

  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

  // No permitir quitarse a uno mismo el rol de admin (evita quedar sin administradores).
  if (usuario.id === req.usuario!.sub && b.rol === "USUARIO") {
    return res.status(400).json({ error: "No puedes quitarte el rol de administrador a ti mismo" });
  }

  const data: any = {};
  if (b.nombre !== undefined) data.nombre = b.nombre;
  if (b.rol !== undefined) data.rol = b.rol;
  if (b.categorias !== undefined) data.categoriasPermitidas = categoriasACsv(b.categorias);
  if (b.puedeSubir !== undefined) data.puedeSubir = b.puedeSubir;
  if (b.puedeVerGaleria !== undefined) data.puedeVerGaleria = b.puedeVerGaleria;
  if (b.puedeVerDashboard !== undefined) data.puedeVerDashboard = b.puedeVerDashboard;
  if (b.puedeDescargar !== undefined) data.puedeDescargar = b.puedeDescargar;
  // Si pasa a ADMIN, ve todas las categorias.
  if (data.rol === ROL_ADMIN) data.categoriasPermitidas = null;

  await prisma.usuario.update({ where: { id: usuario.id }, data });
  await audit(req, "USER_UPDATE", req.usuario!.sub, `edito ${usuario.id}`);
  return res.json({ ok: true });
});

// POST /api/users/:id/reset-password  (solo admin)
router.post("/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  const passwordTemporal = `Voucher2024_${usuario.username}`;
  const passwordHash = await hashPassword(passwordTemporal);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash, debeCambiar: true, intentosFallidos: 0, bloqueadoHasta: null },
  });
  await audit(req, "USER_RESET_PWD", req.usuario!.sub, `reseteo password de ${usuario.id}`);
  return res.json({ ok: true, passwordTemporal });
});

// POST /api/users/:id/reset-2fa  (solo admin) -> el usuario reconfigura 2FA
router.post("/:id/reset-2fa", requireAuth, requireAdmin, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { totpSecret: null, totpActivo: false, backupCodes: null },
  });
  await audit(req, "USER_RESET_2FA", req.usuario!.sub, `reseteo 2FA de ${usuario.id}`);
  return res.json({ ok: true });
});

// DELETE /api/users/:id  (solo admin)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.usuario!.sub) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  const tiene = await prisma.voucher.count({ where: { usuarioId: usuario.id } });
  if (tiene > 0) {
    return res.status(409).json({ error: `No se puede eliminar: tiene ${tiene} voucher(s) asociados.` });
  }
  await prisma.auditLog.updateMany({ where: { usuarioId: usuario.id }, data: { usuarioId: null } });
  await prisma.sesion.deleteMany({ where: { usuarioId: usuario.id } });
  await prisma.usuario.delete({ where: { id: usuario.id } });
  await audit(req, "USER_DELETE", req.usuario!.sub, `elimino ${usuario.id}`);
  return res.json({ ok: true });
});

// GET /api/users/:id  (perfil)
router.get("/:id", requireAuth, async (req, res) => {
  // Un usuario normal solo puede ver su propio perfil.
  if (!req.usuario!.esAdmin && req.usuario!.sub !== req.params.id) {
    return res.status(403).json({ error: "No autorizado" });
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, nombre: true, username: true, rol: true,
      creadoEn: true, ultimoAcceso: true, totpActivo: true,
    },
  });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  const totalVouchers = await prisma.voucher.count({ where: { usuarioId: usuario.id } });
  return res.json({ ...usuario, totalVouchers });
});

// GET /api/users/:id/sessions  (ultimos 10 accesos)
router.get("/:id/sessions", requireAuth, async (req, res) => {
  if (req.usuario!.sub !== req.params.id) {
    return res.status(403).json({ error: "Solo puedes ver tus propias sesiones" });
  }
  const sesiones = await prisma.sesion.findMany({
    where: { usuarioId: req.params.id },
    orderBy: { creadoEn: "desc" },
    take: 10,
    select: { id: true, ip: true, userAgent: true, creadoEn: true, expiraEn: true },
  });
  return res.json({ sesiones });
});

// DELETE /api/users/:id/sessions  (cerrar todas)
router.delete("/:id/sessions", requireAuth, async (req, res) => {
  if (req.usuario!.sub !== req.params.id) {
    return res.status(403).json({ error: "Solo puedes cerrar tus propias sesiones" });
  }
  await prisma.sesion.deleteMany({ where: { usuarioId: req.params.id } });
  return res.json({ ok: true });
});

export default router;
