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

// ============================================================
// Estructura contable de categorias (propuesta "Estructura de Categorias y
// Subcategorias para Vouchers - Coral Store"). Se usa igual para vouchers
// (sustento de pago) y para documentos (nota/factura/boleta = sustento fiscal).
// Espejo en frontend/src/lib/categorias.ts y bot-telegram/bot/categorias.py:
// si se agrega o renombra una categoria aqui, hay que reflejarlo alla.
// ============================================================

// Cada grupo es una categoria principal. El voucherId usa el prefijo del grupo
// y un contador propio (clave = id del grupo). RECOMPRAS reutiliza la clave y
// el prefijo historicos para continuar su numeracion.
export const GRUPOS = [
  {
    id: "PERSONAL",
    prefijo: "PP",
    carpeta: "personal",
    categorias: ["PER_VENTAS", "PER_PRACTICANTES", "PER_LEYES_SOCIALES", "PER_PLANILLA"],
  },
  { id: "RECOMPRAS", prefijo: "RE", carpeta: "recompras", categorias: ["RECOMPRAS"] },
  { id: "COSTO_VENTAS", prefijo: "CV", carpeta: "costo_ventas", categorias: ["CV_MERCADERIA", "CV_FLETES"] },
  {
    id: "VENTAS_MARKETING",
    prefijo: "GV",
    carpeta: "ventas_marketing",
    categorias: [
      "GV_PUBLICIDAD",
      "GV_BRANDING",
      "GV_ALQUILER_TIENDAS",
      "GV_MANT_TIENDAS",
      "GV_TIENDA_AGUA",
      "GV_TIENDA_LUZ",
      "GV_TIENDA_INTERNET",
      "GV_EMPAQUE",
      "GV_DELIVERY",
    ],
  },
  {
    id: "ADMINISTRATIVOS",
    prefijo: "GA",
    carpeta: "administrativos",
    categorias: [
      "GA_ALQUILER_OFICINA",
      "GA_SUMINISTROS",
      "GA_LIMPIEZA",
      "GA_OFICINA_AGUA",
      "GA_OFICINA_LUZ",
      "GA_OFICINA_INTERNET",
      "GA_HONORARIOS",
      "GA_SOFTWARE",
      "GA_SERVIDORES",
      "GA_EQUIPOS",
      "GA_ATENCIONES",
    ],
  },
  { id: "IMPUESTOS", prefijo: "IS", carpeta: "impuestos", categorias: ["IMP_IGV", "IMP_RENTA", "IMP_FRACCIONAMIENTO"] },
  {
    id: "FINANCIEROS",
    prefijo: "GF",
    carpeta: "financieros",
    categorias: ["FIN_COMISIONES", "FIN_INTERESES", "FIN_AMORTIZACION"],
  },
  { id: "INVERSION", prefijo: "IA", carpeta: "inversion", categorias: ["INV_MOBILIARIO", "INV_MEJORAS", "INV_EQUIPOS"] },
  { id: "PATRIMONIO", prefijo: "FP", carpeta: "patrimonio", categorias: ["PAT_AMORTIZACION", "PAT_SOCIOS"] },
  { id: "OTROS", prefijo: "OG", carpeta: "otros", categorias: ["OTR_NO_OPERATIVOS", "OTR_TRANSFERENCIAS"] },
] as const;

export type Grupo = (typeof GRUPOS)[number];
export type CategoriaContable = Grupo["categorias"][number];

export const CATEGORIAS_CONTABLES: readonly CategoriaContable[] = GRUPOS.flatMap((g) => g.categorias);

// Categorias que solo aplican a vouchers (no se pueden usar en documentos).
export const SOLO_VOUCHER: readonly CategoriaContable[] = ["OTR_TRANSFERENCIAS"];

// Tipos de documento (sustento fiscal). Tambien funcionan como permiso: un
// usuario solo puede subir/ver documentos de los tipos que tiene permitidos.
// Ademas son la categoria de los documentos historicos (antes de que los
// documentos llevaran categoria contable).
export const TIPOS_DOCUMENTO = ["NOTA", "FACTURA", "BOLETA"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const PREFIJOS_DOCUMENTO: Record<TipoDocumento, string> = { NOTA: "NT", FACTURA: "FA", BOLETA: "BO" };

// Categorias de la estructura anterior: ya no se usan para subir, pero se
// conservan como validas porque hay vouchers historicos guardados con ellas
// (el admin puede reclasificarlos desde la galeria).
export const CATEGORIAS_LEGADO = [
  "COMPRAS",
  "SERVICIOS",
  "COMPRAS_PROVEEDORES",
  "COMPRAS_OFICINA",
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

// Todas las categorias validas (permisos, filtros, contadores, datos guardados).
export const CATEGORIAS = [...CATEGORIAS_CONTABLES, ...TIPOS_DOCUMENTO, ...CATEGORIAS_LEGADO] as const;
export type Categoria = CategoriaContable | TipoDocumento | (typeof CATEGORIAS_LEGADO)[number];

export function esCategoriaContable(c: string): c is CategoriaContable {
  return (CATEGORIAS_CONTABLES as readonly string[]).includes(c);
}

export function esTipoDocumento(t: string): t is TipoDocumento {
  return (TIPOS_DOCUMENTO as readonly string[]).includes(t);
}

export function grupoDe(c: string): Grupo | undefined {
  return GRUPOS.find((g) => (g.categorias as readonly string[]).includes(c));
}

// Valida la combinacion categoria + tipo de documento para una subida nueva
// (o un cambio de categoria). Devuelve el mensaje de error, o null si es valida.
export function errorCombinacion(categoria: string, tipoDocumento: string | null): string | null {
  if (!esCategoriaContable(categoria)) return "Categoria invalida";
  if (tipoDocumento !== null) {
    if (!esTipoDocumento(tipoDocumento)) return "Tipo de documento invalido";
    if (SOLO_VOUCHER.includes(categoria)) return "Esa categoria solo se usa en vouchers";
  }
  return null;
}

// Carpetas de las categorias anteriores (para mover archivos historicos que
// no se reclasifican).
const CARPETAS_LEGADO: Record<string, string> = {
  COMPRAS: "compras",
  SERVICIOS: "servicios",
  COMPRAS_PROVEEDORES: "compras/proveedores",
  COMPRAS_OFICINA: "compras/oficina",
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

// Carpeta (relativa a STORAGE_PATH) donde se guarda un archivo:
//   vouchers/<grupo>/<categoria>  o  documentos/<tipo>/<grupo>/<categoria>
export function carpetaDe(categoria: string, tipoDocumento: string | null): string {
  const grupo = grupoDe(categoria);
  if (!grupo) return CARPETAS_LEGADO[categoria] ?? "otros";
  const base = tipoDocumento ? `documentos/${tipoDocumento.toLowerCase()}` : "vouchers";
  return `${base}/${grupo.carpeta}/${categoria.toLowerCase()}`;
}

// Clave de contador y prefijo del voucherId: documentos por tipo, vouchers por grupo.
export function numeracionDe(categoria: CategoriaContable, tipoDocumento: TipoDocumento | null): { clave: string; prefijo: string } {
  if (tipoDocumento) return { clave: tipoDocumento, prefijo: PREFIJOS_DOCUMENTO[tipoDocumento] };
  const grupo = grupoDe(categoria)!;
  return { clave: grupo.id, prefijo: grupo.prefijo };
}

// Claves de contador que el seed debe asegurar.
export const CLAVES_CONTADOR: readonly string[] = [...GRUPOS.map((g) => g.id), ...TIPOS_DOCUMENTO];
