import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { config } from "../config.js";

// Compara dos strings en tiempo constante (evita timing attacks sobre el
// token de servicio, que se reutiliza en cada llamada del bot).
function iguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Autenticacion para las rutas del bot de Telegram (/api/bot/*): un token de
// servicio fijo (Bearer), distinto del JWT de sesion que usa la web. El bot
// no tiene "usuario logueado" propio; cada request indica el telegram_user_id
// que le interesa y el backend resuelve el usuario real a partir de ahi.
export function requireServiceToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token || !config.botServiceToken || !iguales(token, config.botServiceToken)) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}
