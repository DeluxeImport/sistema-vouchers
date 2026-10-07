// Estructura contable de categorias (propuesta "Estructura de Categorias y
// Subcategorias para Vouchers - Coral Store"). La usan por igual "Subir
// Voucher" (sustento de pago) y "Subir Documento" (nota/factura/boleta).
// Espejo de backend/src/config.ts: si se agrega o renombra una categoria
// alla, hay que reflejarlo aqui (y en bot-telegram/bot/categorias.py).

export interface GrupoContable {
  id: string;
  label: string;
  color: string;
  categorias: readonly string[];
}

export const GRUPOS = [
  {
    id: "PERSONAL",
    label: "Pagos de Personal y Planilla",
    color: "#2563EB",
    categorias: ["PER_VENTAS", "PER_PRACTICANTES", "PER_LEYES_SOCIALES", "PER_PLANILLA"],
  },
  { id: "RECOMPRAS", label: "Recompras", color: "#16A34A", categorias: ["RECOMPRAS"] },
  {
    id: "COSTO_VENTAS",
    label: "Compras y Mercadería (Costo de Ventas)",
    color: "#EA580C",
    categorias: ["CV_MERCADERIA", "CV_FLETES"],
  },
  {
    id: "VENTAS_MARKETING",
    label: "Gastos de Ventas y Marketing",
    color: "#DB2777",
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
    label: "Gastos Administrativos y Tecnología",
    color: "#7C3AED",
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
  {
    id: "IMPUESTOS",
    label: "Impuestos y SUNAT",
    color: "#DC2626",
    categorias: ["IMP_IGV", "IMP_RENTA", "IMP_FRACCIONAMIENTO"],
  },
  {
    id: "FINANCIEROS",
    label: "Gastos Financieros y Bancos",
    color: "#0891B2",
    categorias: ["FIN_COMISIONES", "FIN_INTERESES", "FIN_AMORTIZACION"],
  },
  {
    id: "INVERSION",
    label: "Inversión y Activos Fijos",
    color: "#0D9488",
    categorias: ["INV_MOBILIARIO", "INV_MEJORAS", "INV_EQUIPOS"],
  },
  {
    id: "PATRIMONIO",
    label: "Financiamiento y Patrimonio",
    color: "#CA8A04",
    categorias: ["PAT_AMORTIZACION", "PAT_SOCIOS"],
  },
  {
    id: "OTROS",
    label: "Otros Gastos",
    color: "#64748B",
    categorias: ["OTR_NO_OPERATIVOS", "OTR_TRANSFERENCIAS"],
  },
] as const satisfies readonly GrupoContable[];

export type CategoriaContable = (typeof GRUPOS)[number]["categorias"][number];
export const CATEGORIAS_CONTABLES: readonly CategoriaContable[] = GRUPOS.flatMap((g) => g.categorias);

// Categorias que solo aplican a vouchers (no aparecen en "Subir Documento").
export const SOLO_VOUCHER: readonly CategoriaContable[] = ["OTR_TRANSFERENCIAS"];

// Tipos de documento. Tambien son permisos (que tipos de documento puede
// subir/ver el usuario) y la categoria de los documentos historicos.
export const TIPOS_DOCUMENTO = ["NOTA", "FACTURA", "BOLETA"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

// Categorias de la estructura anterior (solo para vouchers historicos).
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

export const CATEGORIAS = [...CATEGORIAS_CONTABLES, ...TIPOS_DOCUMENTO, ...CATEGORIAS_LEGADO] as const;
export type Categoria = CategoriaContable | TipoDocumento | (typeof CATEGORIAS_LEGADO)[number];

// Etiqueta corta (dentro de su grupo / subgrupo).
export const LABEL_CATEGORIA: Record<Categoria, string> = {
  PER_VENTAS: "Personal de Ventas",
  PER_PRACTICANTES: "Practicantes",
  PER_LEYES_SOCIALES: "Leyes Sociales y Pensiones (AFP, EsSalud, Vida Ley)",
  PER_PLANILLA: "Planilla",
  RECOMPRAS: "Recompras",
  CV_MERCADERIA: "Compras de Mercadería",
  CV_FLETES: "Fletes de Compra e Importaciones",
  GV_PUBLICIDAD: "Publicidad Digital (Meta Ads, Google Ads, TikTok)",
  GV_BRANDING: "Branding, Diseño y Material POP",
  GV_ALQUILER_TIENDAS: "Alquiler de Tiendas",
  GV_MANT_TIENDAS: "Mantenimiento de Tiendas",
  GV_TIENDA_AGUA: "Agua",
  GV_TIENDA_LUZ: "Luz",
  GV_TIENDA_INTERNET: "Internet",
  GV_EMPAQUE: "Material de Empaque y Bolsas",
  GV_DELIVERY: "Deliveries y Envíos a Clientes",
  GA_ALQUILER_OFICINA: "Alquiler de Oficina Principal",
  GA_SUMINISTROS: "Suministros",
  GA_LIMPIEZA: "Limpieza",
  GA_OFICINA_AGUA: "Agua",
  GA_OFICINA_LUZ: "Luz",
  GA_OFICINA_INTERNET: "Internet",
  GA_HONORARIOS: "Honorarios Profesionales y Asesorías",
  GA_SOFTWARE: "Software, IA y Nube (ChatGPT, Claude, Google, iCloud)",
  GA_SERVIDORES: "Servidores, Hosting y Dominios (VPS, PayU, Red Científica)",
  GA_EQUIPOS: "Equipos e Informática (Mantenimiento PC, Recargas)",
  GA_ATENCIONES: "Atenciones al Personal (reconocimiento cumpleaños)",
  IMP_IGV: "Impuesto General a las Ventas (IGV)",
  IMP_RENTA: "Impuesto a la Renta (Pagos a Cuenta)",
  IMP_FRACCIONAMIENTO: "Fraccionamientos y Oportunidades Fiscales",
  FIN_COMISIONES: "Comisiones Bancarias y Portales de Pago",
  FIN_INTERESES: "Intereses y Portes de Préstamos",
  FIN_AMORTIZACION: "Amortización de Deuda / Préstamos",
  INV_MOBILIARIO: "Mobiliario y Equipamiento de Tiendas / Oficina (Activo Fijo)",
  INV_MEJORAS: "Mejoras en Locales y Remodelaciones",
  INV_EQUIPOS: "Compra de Equipos Cómputo / Maquinaria",
  PAT_AMORTIZACION: "Amortización de Deuda / Préstamos",
  PAT_SOCIOS: "Retiros y Aportes de Socio",
  OTR_NO_OPERATIVOS: "Conceptos No Operativos e Imprevistos",
  OTR_TRANSFERENCIAS: "Transferencias entre Cuentas Propias",
  NOTA: "Nota",
  FACTURA: "Factura",
  BOLETA: "Boleta",
  COMPRAS: "Compras",
  SERVICIOS: "Servicios",
  COMPRAS_PROVEEDORES: "Compras · Proveedores",
  COMPRAS_OFICINA: "Compras · Oficina",
  SERVICIOS_LUZ: "Servicios · Luz",
  SERVICIOS_AGUA: "Servicios · Agua",
  SERVICIOS_MANTENIMIENTO: "Servicios · Mantenimiento",
  SERVICIOS_INTERNET: "Servicios · Internet",
  SFIJOS_CELULAR: "S. Fijos · Pago Celular",
  SFIJOS_CAMARA: "S. Fijos · Cámara de Comercio",
  SFIJOS_PRESUPUESTO: "S. Fijos · Presupuesto Varios",
  SFIJOS_FLETE: "S. Fijos · Flete",
  ALQUILER: "Alquiler",
};

// Subgrupo (tercer nivel) de algunas subcategorias: se muestran juntas bajo
// este titulo y su etiqueta completa lo incluye ("Servicios Básicos de Tiendas · Luz").
export const SUBGRUPO_CATEGORIA: Partial<Record<Categoria, string>> = {
  GV_TIENDA_AGUA: "Servicios Básicos de Tiendas",
  GV_TIENDA_LUZ: "Servicios Básicos de Tiendas",
  GV_TIENDA_INTERNET: "Servicios Básicos de Tiendas",
  GA_OFICINA_AGUA: "Servicios Básicos de Oficina",
  GA_OFICINA_LUZ: "Servicios Básicos de Oficina",
  GA_OFICINA_INTERNET: "Servicios Básicos de Oficina",
};

const COLOR_LEGADO = "#94A3B8";
const COLOR_TIPO: Record<TipoDocumento, string> = { NOTA: "#0891B2", FACTURA: "#DB2777", BOLETA: "#CA8A04" };

export function grupoDe(c: string): (typeof GRUPOS)[number] | undefined {
  return GRUPOS.find((g) => (g.categorias as readonly string[]).includes(c));
}

export function esTipoDocumento(t: string | null | undefined): t is TipoDocumento {
  return !!t && (TIPOS_DOCUMENTO as readonly string[]).includes(t);
}

export function esLegado(c: string): boolean {
  return !grupoDe(c);
}

export function colorCategoria(c: string): string {
  if (esTipoDocumento(c)) return COLOR_TIPO[c];
  return grupoDe(c)?.color ?? COLOR_LEGADO;
}

export function colorTipo(t: TipoDocumento): string {
  return COLOR_TIPO[t];
}

// Etiqueta corta, tolerante a codigos desconocidos.
export function etiquetaCategoria(c: string): string {
  return LABEL_CATEGORIA[c as Categoria] ?? c;
}

// Etiqueta con el subgrupo cuando hace falta para no confundir
// (ej. "Luz" -> "Servicios Básicos de Tiendas · Luz").
export function etiquetaCompleta(c: string): string {
  const sub = SUBGRUPO_CATEGORIA[c as Categoria];
  return sub ? `${sub} · ${etiquetaCategoria(c)}` : etiquetaCategoria(c);
}

// Texto para mostrar la categoria de un registro concreto. Un documento
// historico (categoria = su propio tipo) se muestra como "Sin categoría".
export function etiquetaRegistro(categoria: string, tipoDocumento?: string | null): string {
  if (tipoDocumento && categoria === tipoDocumento) return "Sin categoría contable";
  return etiquetaCompleta(categoria);
}

// Agrupa una lista de subcategorias en bloques consecutivos por subgrupo,
// para pintar "Servicios Básicos de Tiendas: Agua / Luz / Internet" juntos.
export function bloquesPorSubgrupo<T extends string>(categorias: readonly T[]): { titulo?: string; categorias: T[] }[] {
  const bloques: { titulo?: string; categorias: T[] }[] = [];
  for (const c of categorias) {
    const titulo = SUBGRUPO_CATEGORIA[c as unknown as Categoria];
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.titulo === titulo) ultimo.categorias.push(c);
    else bloques.push({ titulo, categorias: [c] });
  }
  return bloques;
}

// Categorias contables que el usuario puede usar, por grupo (vacios fuera).
// soloDocumento excluye las categorias exclusivas de vouchers.
export function gruposPermitidos(permitidas: (c: string) => boolean, soloDocumento = false) {
  return GRUPOS.map((g) => ({
    ...g,
    categorias: g.categorias.filter(
      (c) => permitidas(c) && !(soloDocumento && SOLO_VOUCHER.includes(c))
    ) as CategoriaContable[],
  })).filter((g) => g.categorias.length > 0);
}
