import { prisma } from "../db.js";
import type { AuthUserRecord, AuthUserRepository } from "../application/auth/authUserRepository.js";

export const prismaAuthUserRepository: AuthUserRepository = {
  findById(id: string): Promise<AuthUserRecord | null> {
    return prisma.usuario.findUnique({ where: { id } });
  },
};
