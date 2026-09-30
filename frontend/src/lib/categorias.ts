// COMPRAS y SERVICIOS ya no se usan para subir vouchers nuevos (se reemplazaron
// por subcategorias), pero se conservan como categorias validas porque pueden
// existir vouchers historicos guardados con ellas.
export const CATEGORIAS_LEGADO = ["COMPRAS", "SERVICIOS"] as const;

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

// Todas las categorias validas (permisos, filtros, contadores): incluye el
// legado para no romper vouchers historicos.
export const CATEGORIAS = [...CATEGORIAS_LEGADO, ...CATEGORIAS_VOUCHER, ...CATEGORIAS_DOCUMENTO] as const;
export type Categoria = (typeof CATEGORIAS)[number];

// Lo que puede elegirse al subir un voucher nuevo (sin el legado).
export const CATEGORIAS_SUBIBLES = [...CATEGORIAS_VOUCHER, ...CATEGORIAS_DOCUMENTO] as const;

export const COLOR_CATEGORIA: Record<Categoria, string> = {
  COMPRAS: "#2563EB",
  SERVICIOS: "#EA580C",
  COMPRAS_PROVEEDORES: "#2563EB",
  COMPRAS_OFICINA: "#1D4ED8",
  RECOMPRAS: "#16A34A",
  SERVICIOS_LUZ: "#F59E0B",
  SERVICIOS_AGUA: "#0EA5E9",
  SERVICIOS_MANTENIMIENTO: "#64748B",
  SERVICIOS_INTERNET: "#6366F1",
  SFIJOS_CELULAR: "#14B8A6",
  SFIJOS_CAMARA: "#0D9488",
  SFIJOS_PRESUPUESTO: "#0F766E",
  SFIJOS_FLETE: "#059669",
  ALQUILER: "#9333EA",
  NOTA: "#0891B2",
  FACTURA: "#DB2777",
  BOLETA: "#CA8A04",
};

export const LABEL_CATEGORIA: Record<Categoria, string> = {
  COMPRAS: "Compras",
  SERVICIOS: "Servicios",
  COMPRAS_PROVEEDORES: "Proveedores",
  COMPRAS_OFICINA: "Oficina",
  RECOMPRAS: "Recompras",
  SERVICIOS_LUZ: "Luz",
  SERVICIOS_AGUA: "Agua",
  SERVICIOS_MANTENIMIENTO: "Mantenimiento",
  SERVICIOS_INTERNET: "Internet",
  SFIJOS_CELULAR: "Pago Celular",
  SFIJOS_CAMARA: "Cámara de Comercio",
  SFIJOS_PRESUPUESTO: "Presupuesto Varios",
  SFIJOS_FLETE: "Flete",
  ALQUILER: "Alquiler",
  NOTA: "Nota",
  FACTURA: "Factura",
  BOLETA: "Boleta",
};

export const PREFIJO_CATEGORIA: Record<Categoria, string> = {
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

export interface GrupoCategoria {
  id: string;
  label: string;
  // Color representativo del grupo (para verlo agregado, ej. en un resumen).
  color: string;
  // Categoria plana historica que se suma a este grupo en los totales, si aplica.
  legado?: Categoria;
  subcategorias: Categoria[];
}

// Categorias que ahora se organizan en subcategorias obligatorias.
export const GRUPOS_VOUCHER: GrupoCategoria[] = [
  {
    id: "compras",
    label: "Compras",
    color: COLOR_CATEGORIA.COMPRAS,
    legado: "COMPRAS",
    subcategorias: ["COMPRAS_PROVEEDORES", "COMPRAS_OFICINA"],
  },
  {
    id: "servicios",
    label: "Servicios",
    color: COLOR_CATEGORIA.SERVICIOS,
    legado: "SERVICIOS",
    subcategorias: ["SERVICIOS_LUZ", "SERVICIOS_AGUA", "SERVICIOS_MANTENIMIENTO", "SERVICIOS_INTERNET"],
  },
  {
    id: "servicios_fijos",
    label: "Servicios Fijos",
    color: "#0D9488",
    subcategorias: ["SFIJOS_CELULAR", "SFIJOS_CAMARA", "SFIJOS_PRESUPUESTO", "SFIJOS_FLETE"],
  },
];

// Categorias de voucher que no pertenecen a ningun grupo (se eligen solas).
export const CATEGORIAS_SUELTAS: Categoria[] = ["RECOMPRAS", "ALQUILER"];
