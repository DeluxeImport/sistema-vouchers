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
  // Token de servicio (Bearer) que usa el bot de Telegram para llamar a /api/bot/*.
  // No es un JWT de usuario: es un secreto compartido fijo, distinto del login web.
  botServiceToken: process.env.BOT_SERVICE_TOKEN ?? "",
  // Username del bot (sin @), para armar el deep link t.me/<bot>?start=TOKEN.
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
};

// En produccion exigimos un JWT_SECRET fuerte: el sistema no arranca con la
// clave de desarrollo ni con una clave corta (evita falsificacion de tokens).
if (config.nodeEnv === "production") {
  if (!process.env.JWT_SECRET || config.jwtSecret === "dev-secret" || config.jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET ausente o debil. Define en el .env una clave aleatoria de al menos 32 caracteres para produccion."
    );
  }
  // Mismo criterio que el JWT: sin un token de servicio fuerte, cualquiera
  // podria golpear /api/bot/* y crear vouchers o vincular cuentas ajenas.
  if (!config.botServiceToken || config.botServiceToken.length < 32) {
    throw new Error(
      "BOT_SERVICE_TOKEN ausente o debil. Define en el .env una clave aleatoria de al menos 32 caracteres para produccion."
    );
  }
}

// COMPRAS y SERVICIOS ya no se usan para subir vouchers nuevos (se reemplazaron
// por subcategorias), pero se conservan como categorias validas porque pueden
// existir vouchers historicos guardados con ellas.
export const CATEGORIAS_LEGADO = ["COMPRAS", "SERVICIOS"] as const;

// Grupo 1: vouchers (incluye las subcategorias de Compras, Servicios y
// Servicios Fijos). Grupo 2: documentos (nota, factura, boleta).
export const CATEGORIAS_VOUCHER = [
  "COMPRAS_PROVEEDORES",
  "COMPRAS_OFICINA",
  "RECOMPRAS",
  "SERVICIOS_LUZ",
  "SERVICIOS_AGUA",
  "SERVICIOS_MANTENIMIENTO",
  "SERVICIOS_INTERNET",
  "SFIJOS_CELULAR",
  "SFIJOS_CAMARA",
  "SFIJOS_PRESUPUESTO",
  "SFIJOS_FLETE",
  "ALQUILER",
] as const;
export const CATEGORIAS_DOCUMENTO = ["NOTA", "FACTURA", "BOLETA"] as const;

// Todas las categorias validas (para permisos, filtros y contadores):
// incluye el legado para no romper vouchers historicos.
export const CATEGORIAS = [...CATEGORIAS_LEGADO, ...CATEGORIAS_VOUCHER, ...CATEGORIAS_DOCUMENTO] as const;
export type Categoria = (typeof CATEGORIAS)[number];

// Lo que puede elegirse al subir un voucher nuevo (sin el legado).
export const CATEGORIAS_SUBIBLES = [...CATEGORIAS_VOUCHER, ...CATEGORIAS_DOCUMENTO] as const;

export const PREFIJOS: Record<Categoria, string> = {
  COMPRAS: "CP",
  SERVICIOS: "SV",
  COMPRAS_PROVEEDORES: "CPP",
  COMPRAS_OFICINA: "CPO",
  RECOMPRAS: "RE",
  SERVICIOS_LUZ: "SVL",
  SERVICIOS_AGUA: "SVA",
  SERVICIOS_MANTENIMIENTO: "SVM",
  SERVICIOS_INTERNET: "SVI",
  SFIJOS_CELULAR: "SFC",
  SFIJOS_CAMARA: "SFM",
  SFIJOS_PRESUPUESTO: "SFP",
  SFIJOS_FLETE: "SFL",
  ALQUILER: "AL",
  NOTA: "NT",
  FACTURA: "FA",
  BOLETA: "BO",
};

export const CARPETAS: Record<Categoria, string> = {
  COMPRAS: "compras",
  SERVICIOS: "servicios",
  COMPRAS_PROVEEDORES: "compras/proveedores",
  COMPRAS_OFICINA: "compras/oficina",
  RECOMPRAS: "recompras",
  SERVICIOS_LUZ: "servicios/luz",
  SERVICIOS_AGUA: "servicios/agua",
  SERVICIOS_MANTENIMIENTO: "servicios/mantenimiento",
  SERVICIOS_INTERNET: "servicios/internet",
  SFIJOS_CELULAR: "servicios_fijos/celular",
  SFIJOS_CAMARA: "servicios_fijos/camara_comercio",
  SFIJOS_PRESUPUESTO: "servicios_fijos/presupuesto_varios",
  SFIJOS_FLETE: "servicios_fijos/flete",
  ALQUILER: "alquiler",
  NOTA: "nota",
  FACTURA: "factura",
  BOLETA: "boleta",
};
