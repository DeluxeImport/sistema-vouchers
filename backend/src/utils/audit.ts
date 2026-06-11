import type { Request } from "express";
import { prisma } from "../db.js";

export function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.ip ?? req.socket.remoteAddress ?? "desconocida";
}

export async function audit(
  req: Request,
  accion: string,
  usuarioId: string | null,
  detalles?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId,
        accion,
        ip: getIp(req),
        userAgent: req.headers["user-agent"] ?? null,
        detalles: detalles ?? null,
      },
    });
  } catch {
    // el log de auditoria no debe romper el flujo principal
  }
}
