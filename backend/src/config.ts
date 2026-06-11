import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  jwtExpiration: process.env.JWT_EXPIRATION ?? "8h",
  totpIssuer: process.env.TOTP_ISSUER ?? "SistemaVouchers",
  totpWindow: Number(process.env.TOTP_WINDOW ?? 1),
  storagePath: process.env.STORAGE_PATH ?? "./storage/vouchers",
  maxFileSize: Number(process.env.MAX_FILE_SIZE ?? 10485760),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};

// En produccion exigimos un JWT_SECRET fuerte: el sistema no arranca con la
// clave de desarrollo ni con una clave corta (evita falsificacion de tokens).
if (config.nodeEnv === "production") {
  if (!process.env.JWT_SECRET || config.jwtSecret === "dev-secret" || config.jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET ausente o debil. Define en el .env una clave aleatoria de al menos 32 caracteres para produccion."
    );
  }
}

// Grupo 1: vouchers. Grupo 2: documentos (nota, factura, boleta).
export const CATEGORIAS_VOUCHER = ["COMPRAS", "RECOMPRAS", "SERVICIOS", "ALQUILER"] as const;
export const CATEGORIAS_DOCUMENTO = ["NOTA", "FACTURA", "BOLETA"] as const;
export const CATEGORIAS = [...CATEGORIAS_VOUCHER, ...CATEGORIAS_DOCUMENTO] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const PREFIJOS: Record<Categoria, string> = {
  COMPRAS: "CP",
  RECOMPRAS: "RE",
  SERVICIOS: "SV",
  ALQUILER: "AL",
  NOTA: "NT",
  FACTURA: "FA",
  BOLETA: "BO",
};

export const CARPETAS: Record<Categoria, string> = {
  COMPRAS: "compras",
  RECOMPRAS: "recompras",
  SERVICIOS: "servicios",
  ALQUILER: "alquiler",
  NOTA: "nota",
  FACTURA: "factura",
  BOLETA: "boleta",
};
