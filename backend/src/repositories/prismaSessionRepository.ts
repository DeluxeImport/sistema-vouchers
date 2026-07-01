import { prisma } from "../db.js";
import type { SessionRecord, SessionRepository } from "../application/auth/sessionUseCases.js";

export const prismaSessionRepository: SessionRepository = {
  async create(data) {
    return prisma.sesion.create({ data }) as Promise<SessionRecord>;
  },

  async findValidByTokenHash(tokenHash, usuarioId, now) {
    return prisma.sesion.findFirst({
      where: {
        tokenHash,
        usuarioId,
        expiraEn: { gt: now },
      },
    }) as Promise<SessionRecord | null>;
  },

  async deleteByTokenHash(tokenHash) {
    await prisma.sesion.deleteMany({ where: { tokenHash } });
  },

  async deleteManyByUserId(usuarioId, exceptTokenHash) {
    await prisma.sesion.deleteMany({
      where: {
        usuarioId,
        ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}),
      },
    });
  },
};
