export const CATEGORIAS_VOUCHER = ["COMPRAS", "RECOMPRAS", "SERVICIOS", "ALQUILER"] as const;
export const CATEGORIAS_DOCUMENTO = ["NOTA", "FACTURA", "BOLETA"] as const;
export const CATEGORIAS = [...CATEGORIAS_VOUCHER, ...CATEGORIAS_DOCUMENTO] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const COLOR_CATEGORIA: Record<Categoria, string> = {
  COMPRAS: "#2563EB",
  RECOMPRAS: "#16A34A",
  SERVICIOS: "#EA580C",
  ALQUILER: "#9333EA",
  NOTA: "#0891B2",
  FACTURA: "#DB2777",
  BOLETA: "#CA8A04",
};

export const LABEL_CATEGORIA: Record<Categoria, string> = {
  COMPRAS: "Compras",
  RECOMPRAS: "Recompras",
  SERVICIOS: "Servicios",
  ALQUILER: "Alquiler",
  NOTA: "Nota",
  FACTURA: "Factura",
  BOLETA: "Boleta",
};

export const PREFIJO_CATEGORIA: Record<Categoria, string> = {
  COMPRAS: "CP",
  RECOMPRAS: "RE",
  SERVICIOS: "SV",
  ALQUILER: "AL",
  NOTA: "NT",
  FACTURA: "FA",
  BOLETA: "BO",
};
