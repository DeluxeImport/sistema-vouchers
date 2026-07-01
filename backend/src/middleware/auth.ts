import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config, type Categoria } from "../config.js";
import { prismaAuthUserRepository } from "../repositories/prismaAuthUserRepository.js";
import { prismaSessionRepository } from "../repositories/prismaSessionRepository.js";
import { validarSesionActiva, type SessionRepository } from "../application/auth/sessionUseCases.js";
import type { AuthUserRecord, AuthUserRepository } from "../application/auth/authUserRepository.js";
import { categoriasDe, esAdmin } from "../utils/permisos.js";

export type { AuthUserRecord, AuthUserRepository } from "../application/auth/authUserRepository.js";

export interface TokenPayload {
  sub: string;
  username: string;
}

// Datos del usuario autenticado disponibles en cada request.
export interface UsuarioAuth {
  sub: string;
  username: string;
  rol: string;
  esAdmin: boolean;
  categorias: Categoria[];
  puedeSubir: boolean;
  puedeVerGaleria: boolean;
  puedeVerDashboard: boolean;
  puedeDescargar: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAuth;
      authToken?: string;
    }
  }
}

export function firmarToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiration } as jwt.SignOptions);
}

// Token temporal para el paso intermedio de 2FA (solo permite verificar TOTP)
export function firmarToken2FA(sub: string): string {
  return jwt.sign({ sub, paso: "2fa" }, config.jwtSecret, { expiresIn: "5m" });
}

export function verificarToken2FA(token: string): string | null {
  try {
    const d = jwt.verify(token, config.jwtSecret) as { sub: string; paso?: string };
    if (d.paso !== "2fa") return null;
    return d.sub;
  } catch {
    return null;
  }
}

export function createRequireAuth(deps: {
  jwtSecret: string;
  sessionRepository: SessionRepository;
  userRepository: AuthUserRepository;
}) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      return res.status(401).json({ error: "No autenticado" });
    }
    let payload: TokenPayload & { paso?: string };
    try {
      payload = jwt.verify(token, deps.jwtSecret) as TokenPayload & { paso?: string };
    } catch {
      return res.status(401).json({ error: "Token invalido o expirado" });
    }
    if (payload.paso === "2fa") {
      return res.status(401).json({ error: "Token incompleto, falta verificar 2FA" });
    }

    const sesion = await validarSesionActiva(deps.sessionRepository, token, payload.sub);
    if (!sesion) {
      return res.status(401).json({ error: "Sesion expirada o revocada" });
    }

    // Cargamos el usuario fresco para que cambios de rol/permisos apliquen al instante.
    const u = await deps.userRepository.findById(payload.sub);
    if (!u) return res.status(401).json({ error: "Usuario no encontrado" });

    req.authToken = token;
    req.usuario = {
      sub: u.id,
      username: u.username,
      rol: u.rol,
      esAdmin: esAdmin(u),
      categorias: categoriasDe(u),
      puedeSubir: u.puedeSubir,
      puedeVerGaleria: u.puedeVerGaleria,
      puedeVerDashboard: u.puedeVerDashboard,
      puedeDescargar: u.puedeDescargar,
    };
    next();
  };
}

export const requireAuth = createRequireAuth({
  jwtSecret: config.jwtSecret,
  sessionRepository: prismaSessionRepository,
  userRepository: prismaAuthUserRepository,
});

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario?.esAdmin) {
    return res.status(403).json({ error: "Requiere permisos de administrador" });
  }
  next();
}
