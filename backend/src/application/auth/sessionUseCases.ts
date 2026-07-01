import crypto from "node:crypto";

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface SessionRecord {
  id: number;
  usuarioId: string;
  tokenHash: string;
  ip: string | null;
  userAgent: string | null;
  expiraEn: Date;
}

export interface SessionRepository {
  create(data: Omit<SessionRecord, "id">): Promise<SessionRecord>;
  findValidByTokenHash(tokenHash: string, usuarioId: string, now: Date): Promise<SessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteManyByUserId(usuarioId: string, exceptTokenHash?: string): Promise<void>;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}

export async function crearSesion(
  repo: SessionRepository,
  input: {
    usuarioId: string;
    token: string;
    ip?: string | null;
    userAgent?: string | null;
    now?: Date;
    ttlMs?: number;
  }
): Promise<SessionRecord> {
  const now = input.now ?? new Date();
  return repo.create({
    usuarioId: input.usuarioId,
    tokenHash: hashToken(input.token),
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    expiraEn: new Date(now.getTime() + (input.ttlMs ?? SESSION_TTL_MS)),
  });
}

export function validarSesionActiva(
  repo: SessionRepository,
  token: string,
  usuarioId: string,
  now = new Date()
): Promise<SessionRecord | null> {
  return repo.findValidByTokenHash(hashToken(token), usuarioId, now);
}

export function revocarToken(repo: SessionRepository, token: string): Promise<void> {
  return repo.deleteByTokenHash(hashToken(token));
}

export function revocarSesionesDeUsuario(
  repo: SessionRepository,
  usuarioId: string,
  exceptToken?: string
): Promise<void> {
  return repo.deleteManyByUserId(usuarioId, exceptToken ? hashToken(exceptToken) : undefined);
}
