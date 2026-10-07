import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db.js";
import { config, errorCombinacion, type Categoria, type CategoriaContable, type TipoDocumento } from "../config.js";
import { requireServiceToken } from "../middleware/botAuth.js";
import { categoriasDe, esAdmin } from "../utils/permisos.js";
import { procesarYGuardar } from "../services/voucherService.js";
import { esTokenValido } from "../services/vinculacionService.js";
import { audit, getIp } from "../utils/audit.js";

// Rutas que consume el bot de Telegram (proyecto aparte). Autenticadas con un
// token de servicio fijo (ver botAuth.ts), no con el JWT de sesion de la web.
// El bot nunca decide permisos: siempre resuelve el usuario real a partir del
// telegram_user_id y reutiliza exactamente los mismos permisos que la web.
const router = Router();
router.use(requireServiceToken);

const MIMES_VALIDOS = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (MIMES_VALIDOS.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Formato no permitido. Use JPG, PNG, WEBP, HEIC o PDF."));
  },
});

// POST /api/bot/vincular  { token, telegramUserId }
// El bot llama esto cuando alguien manda /start TOKEN: canjea el token de un
// solo uso generado desde el perfil web y guarda el telegram_user_id real.
const vincularSchema = z.object({
  token: z.string().min(1),
  telegramUserId: z.string().min(1),
});
router.post("/vincular", async (req, res) => {
  const parse = vincularSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const { token, telegramUserId } = parse.data;

  const tv = await prisma.tokenVinculacion.findUnique({ where: { token } });
  if (!tv || !esTokenValido(tv)) {
    return res.status(400).json({ error: "Token invalido o vencido" });
  }

  const yaVinculado = await prisma.usuario.findUnique({ where: { telegramUserId } });
  if (yaVinculado && yaVinculado.id !== tv.usuarioId) {
    return res.status(409).json({ error: "Ese Telegram ya esta vinculado a otra cuenta" });
  }

  await prisma.$transaction([
    prisma.tokenVinculacion.update({ where: { token }, data: { usado: true } }),
    prisma.usuario.update({ where: { id: tv.usuarioId }, data: { telegramUserId } }),
  ]);

  const usuario = await prisma.usuario.findUnique({ where: { id: tv.usuarioId } });
  await audit(req, "TELEGRAM_VINCULADO", tv.usuarioId, `telegram_user_id=${telegramUserId}`);
  return res.json({ ok: true, usuario: { id: usuario!.id, nombre: usuario!.nombre, username: usuario!.username } });
});

// GET /api/bot/usuario/:telegramUserId
// El bot lo llama al recibir cualquier mensaje, para saber quien escribe y
// que categorias puede usar (misma logica que la web: categoriasDe()).
router.get("/usuario/:telegramUserId", async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { telegramUserId: req.params.telegramUserId } });
  if (!usuario) return res.status(404).json({ error: "Cuenta no vinculada" });
  return res.json({
    id: usuario.id,
    nombre: usuario.nombre,
    username: usuario.username,
    esAdmin: esAdmin(usuario),
    categorias: categoriasDe(usuario),
    puedeSubir: usuario.puedeSubir,
  });
});

// POST /api/bot/vouchers  (multipart, campo "imagen")
const metaSchema = z.object({
  telegramUserId: z.string().min(1),
  categoria: z.string().min(1),
  // Ausente = voucher; NOTA / FACTURA / BOLETA = documento.
  tipoDocumento: z.string().optional(),
  chatId: z.string().optional(),
  fecha: z.string().optional(),
  descripcion: z.string().optional(),
});
router.post("/vouchers", upload.single("imagen"), async (req, res) => {
  const parse = metaSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const { telegramUserId, chatId, fecha, descripcion } = parse.data;
  const categoria = parse.data.categoria.toUpperCase();
  const tipoDocumento = parse.data.tipoDocumento ? parse.data.tipoDocumento.toUpperCase() : null;

  const usuario = await prisma.usuario.findUnique({ where: { telegramUserId } });
  if (!usuario) return res.status(404).json({ error: "Cuenta no vinculada" });
  if (!usuario.puedeSubir) return res.status(403).json({ error: "No tiene permiso para subir" });

  const errorDatos = errorCombinacion(categoria, tipoDocumento);
  if (errorDatos) return res.status(400).json({ error: errorDatos });
  const permitidas = categoriasDe(usuario);
  if (!permitidas.includes(categoria as Categoria)) {
    return res.status(403).json({ error: "No tiene permiso para esta categoria" });
  }
  if (tipoDocumento && !permitidas.includes(tipoDocumento as Categoria)) {
    return res.status(403).json({ error: "No tiene permiso para este tipo de documento" });
  }

  const archivo = req.file;
  if (!archivo) return res.status(400).json({ error: "Debe enviar una imagen" });

  // El grupo es solo informativo (etiqueta de area en la auditoria); si el
  // chat_id no esta registrado igual se acepta la subida.
  let areaGrupo: string | null = null;
  if (chatId) {
    const grupo = await prisma.grupoTelegram.findUnique({ where: { chatId } });
    areaGrupo = grupo?.areaOCentroCosto ?? null;
  }

  // Igual que en la carga web: mediodia local para que el huso no corra la fecha un dia.
  const fechaVoucher = fecha ? new Date(`${fecha}T12:00:00`) : null;
  try {
    const resultado = await procesarYGuardar(
      { buffer: archivo.buffer, mimetype: archivo.mimetype, size: archivo.size },
      categoria as CategoriaContable,
      tipoDocumento as TipoDocumento | null,
      usuario.id,
      getIp(req),
      { fechaVoucher: isNaN(fechaVoucher?.getTime() ?? NaN) ? null : fechaVoucher, descripcion }
    );
    await audit(
      req,
      "UPLOAD",
      usuario.id,
      `canal=telegram chat=${chatId ?? "-"} area=${areaGrupo ?? "-"} ${tipoDocumento ?? "VOUCHER"} ${categoria}: ${resultado.voucherId}`
    );
    return res.status(201).json({ voucher: resultado });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Archivo invalido" });
  }
});

export default router;
