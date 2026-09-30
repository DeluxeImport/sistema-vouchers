import crypto from "node:crypto";
import { prisma } from "../db.js";

// Minutos de vigencia del token de un solo uso para vincular Telegram.
export const MINUTOS_EXPIRACION_VINCULACION = 10;

// Verifica si un token de vinculacion todavia puede usarse (no usado y no
// vencido). Funcion pura para poder probarla sin tocar la base de datos.
export function esTokenValido(tv: { usado: boolean; expiraEn: Date }, ahora: Date = new Date()): boolean {
  if (tv.usado) return false;
  return tv.expiraEn.getTime() > ahora.getTime();
}

// Genera y guarda un token de un solo uso para el usuario indicado.
export async function generarTokenVinculacion(usuarioId: string): Promise<{ token: string; expiraEn: Date }> {
  const token = crypto.randomBytes(24).toString("hex");
  const expiraEn = new Date(Date.now() + MINUTOS_EXPIRACION_VINCULACION * 60 * 1000);
  await prisma.tokenVinculacion.create({ data: { token, usuarioId, expiraEn } });
  return { token, expiraEn };
}
