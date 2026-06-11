import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_COST = 12;

export function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, BCRYPT_COST);
}

export function compararPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}

// Validaciones de contrasena segura (sub-modulo 2.1.2)
export function validarPasswordSegura(pwd: string): string[] {
  const errores: string[] = [];
  if (pwd.length < 8) errores.push("Minimo 8 caracteres.");
  if (!/[A-Z]/.test(pwd)) errores.push("Al menos 1 letra mayuscula.");
  if (!/[a-z]/.test(pwd)) errores.push("Al menos 1 letra minuscula.");
  if (!/[0-9]/.test(pwd)) errores.push("Al menos 1 numero.");
  if (!/[!@#$%^&*]/.test(pwd)) errores.push("Al menos 1 caracter especial (!@#$%^&*).");
  return errores;
}

// Genera 8 codigos de respaldo de un solo uso
export function generarBackupCodes(): { planos: string[]; hashes: string[] } {
  const planos: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars
    const formato = `${code.slice(0, 5)}-${code.slice(5)}`;
    planos.push(formato);
    hashes.push(hashBackupCode(formato));
  }
  return { planos, hashes };
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
