import { Router } from "express";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { prisma } from "../db.js";
import { config } from "../config.js";
import {
  firmarToken,
  firmarToken2FA,
  verificarToken2FA,
  requireAuth,
} from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";
import {
  compararPassword,
  hashPassword,
  validarPasswordSegura,
  generarBackupCodes,
  hashBackupCode,
} from "../services/authService.js";
import { audit, getIp } from "../utils/audit.js";
import { categoriasDe, esAdmin } from "../utils/permisos.js";

const router = Router();

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const { username, password } = parse.data;

  const usuario = await prisma.usuario.findUnique({ where: { username } });
  if (!usuario) {
    await audit(req, "LOGIN_FAIL", null, `usuario inexistente: ${username}`);
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  // Bloqueo temporal de cuenta
  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    const restante = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60000);
    return res.status(423).json({ error: `Cuenta bloqueada. Intenta en ${restante} min.` });
  }

  const ok = await compararPassword(password, usuario.passwordHash);
  if (!ok) {
    const intentos = usuario.intentosFallidos + 1;
    const data: { intentosFallidos: number; bloqueadoHasta?: Date } = { intentosFallidos: intentos };
    if (intentos >= MAX_INTENTOS) {
      data.bloqueadoHasta = new Date(Date.now() + BLOQUEO_MIN * 60000);
      data.intentosFallidos = 0;
    }
    await prisma.usuario.update({ where: { id: usuario.id }, data });
    await audit(req, "LOGIN_FAIL", usuario.id, `intento ${intentos}`);
    if (data.bloqueadoHasta) {
      return res.status(423).json({ error: `Cuenta bloqueada por ${BLOQUEO_MIN} min tras ${MAX_INTENTOS} intentos.` });
    }
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  // Reset de intentos al loguear bien
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });

  // Si 2FA activo -> requiere segundo paso
  if (usuario.totpActivo) {
    const token2fa = firmarToken2FA(usuario.id);
    await audit(req, "LOGIN_OK", usuario.id, "pendiente 2FA");
    return res.json({ requiere2FA: true, token2fa });
  }

  // Sin 2FA aun (primer login): emitir token completo
  const token = firmarToken({ sub: usuario.id, username: usuario.username });
  await registrarSesion(usuario.id, token, req);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
  await audit(req, "LOGIN_OK", usuario.id);
  return res.json({
    token,
    debeCambiar: usuario.debeCambiar,
    totpActivo: usuario.totpActivo,
    usuario: perfilPublico(usuario),
  });
});

// POST /api/auth/verify-2fa
const verify2faSchema = z.object({
  token2fa: z.string(),
  codigo: z.string().min(6).max(8),
});
router.post("/verify-2fa", loginLimiter, async (req, res) => {
  const parse = verify2faSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const { token2fa, codigo } = parse.data;

  const usuarioId = verificarToken2FA(token2fa);
  if (!usuarioId) return res.status(401).json({ error: "Sesion 2FA invalida o expirada" });

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.totpSecret) return res.status(401).json({ error: "Usuario invalido" });

  const valido = speakeasy.totp.verify({
    secret: usuario.totpSecret,
    encoding: "base32",
    token: codigo,
    window: config.totpWindow,
  });

  if (!valido) {
    await audit(req, "LOGIN_FAIL", usuario.id, "codigo 2FA invalido");
    return res.status(401).json({ error: "Codigo 2FA incorrecto" });
  }

  const token = firmarToken({ sub: usuario.id, username: usuario.username });
  await registrarSesion(usuario.id, token, req);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
  await audit(req, "LOGIN_OK", usuario.id, "2FA verificado");
  return res.json({ token, debeCambiar: usuario.debeCambiar, totpActivo: true, usuario: perfilPublico(usuario) });
});

// POST /api/auth/backup-code
const backupSchema = z.object({ token2fa: z.string(), codigo: z.string() });
router.post("/backup-code", loginLimiter, async (req, res) => {
  const parse = backupSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const usuarioId = verificarToken2FA(parse.data.token2fa);
  if (!usuarioId) return res.status(401).json({ error: "Sesion 2FA invalida o expirada" });

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.backupCodes) return res.status(401).json({ error: "Sin codigos de respaldo" });

  const codigos: string[] = JSON.parse(usuario.backupCodes);
  const hash = hashBackupCode(parse.data.codigo);
  const idx = codigos.indexOf(hash);
  if (idx === -1) {
    await audit(req, "LOGIN_FAIL", usuario.id, "backup code invalido");
    return res.status(401).json({ error: "Codigo de respaldo invalido" });
  }
  // invalidar tras uso
  codigos.splice(idx, 1);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { backupCodes: JSON.stringify(codigos) } });

  const token = firmarToken({ sub: usuario.id, username: usuario.username });
  await registrarSesion(usuario.id, token, req);
  await audit(req, "LOGIN_OK", usuario.id, "backup code usado");
  return res.json({ token, debeCambiar: usuario.debeCambiar, totpActivo: true, usuario: perfilPublico(usuario), codigosRestantes: codigos.length });
});

// PUT /api/auth/change-password
const changePwdSchema = z.object({
  actual: z.string(),
  nueva: z.string(),
  confirmar: z.string(),
});
router.put("/change-password", requireAuth, async (req, res) => {
  const parse = changePwdSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Datos invalidos" });
  const { actual, nueva, confirmar } = parse.data;
  if (nueva !== confirmar) return res.status(400).json({ error: "La confirmacion no coincide" });

  const errores = validarPasswordSegura(nueva);
  if (errores.length) return res.status(400).json({ error: "Contrasena insegura", detalles: errores });

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

  const ok = await compararPassword(actual, usuario.passwordHash);
  if (!ok) return res.status(401).json({ error: "Contrasena actual incorrecta" });

  const passwordHash = await hashPassword(nueva);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash, debeCambiar: false },
  });
  await audit(req, "PASSWORD_CHANGE", usuario.id);
  return res.json({ ok: true, debeCambiar: false });
});

// POST /api/auth/setup-2fa  -> genera secreto + QR
router.post("/setup-2fa", requireAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

  const secret = speakeasy.generateSecret({
    name: `${config.totpIssuer} (${usuario.username})`,
    issuer: config.totpIssuer,
  });

  // Guardar el secreto provisional (se confirma con confirm-2fa)
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { totpSecret: secret.base32, totpActivo: false },
  });

  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url ?? "");
  return res.json({ qr: qrDataUrl, secreto: secret.base32 });
});

// POST /api/auth/confirm-2fa -> valida primer codigo y activa
const confirm2faSchema = z.object({ codigo: z.string().min(6).max(6) });
router.post("/confirm-2fa", requireAuth, async (req, res) => {
  const parse = confirm2faSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Codigo invalido" });
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario || !usuario.totpSecret) return res.status(400).json({ error: "Primero genera el QR (setup-2fa)" });

  const valido = speakeasy.totp.verify({
    secret: usuario.totpSecret,
    encoding: "base32",
    token: parse.data.codigo,
    window: config.totpWindow,
  });
  if (!valido) return res.status(400).json({ error: "Codigo incorrecto" });

  const { planos, hashes } = generarBackupCodes();
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { totpActivo: true, backupCodes: JSON.stringify(hashes) },
  });
  await audit(req, "2FA_SETUP", usuario.id);
  return res.json({ ok: true, backupCodes: planos });
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req, res) => {
  await audit(req, "LOGOUT", req.usuario!.sub);
  // Las sesiones se limpian de forma natural por expiracion; aqui registramos el evento.
  return res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  return res.json({ usuario: perfilPublico(usuario), debeCambiar: usuario.debeCambiar, totpActivo: usuario.totpActivo });
});

function perfilPublico(u: {
  id: string; nombre: string; username: string; rol: string;
  categoriasPermitidas: string | null;
  puedeSubir: boolean; puedeVerGaleria: boolean; puedeVerDashboard: boolean; puedeDescargar: boolean;
}) {
  return {
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    rol: u.rol,
    esAdmin: esAdmin(u),
    categorias: categoriasDe(u),
    puedeSubir: u.puedeSubir,
    puedeVerGaleria: u.puedeVerGaleria,
    puedeVerDashboard: u.puedeVerDashboard,
    puedeDescargar: u.puedeDescargar,
  };
}

async function registrarSesion(usuarioId: string, token: string, req: any) {
  const expira = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const tokenHash = hashBackupCode(token);
  await prisma.sesion.create({
    data: { usuarioId, tokenHash, ip: getIp(req), userAgent: req.headers["user-agent"] ?? null, expiraEn: expira },
  });
}

export default router;
