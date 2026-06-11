import { CATEGORIAS, type Categoria } from "../config.js";

export const ROL_ADMIN = "ADMIN";

export interface UsuarioConPermisos {
  rol: string;
  categoriasPermitidas: string | null;
  puedeSubir: boolean;
  puedeVerGaleria: boolean;
  puedeVerDashboard: boolean;
  puedeDescargar: boolean;
}

export function esAdmin(u: { rol: string }): boolean {
  return u.rol === ROL_ADMIN;
}

// Lista de categorias que el usuario puede ver/usar.
// Admin: todas. Normal: las de su CSV (vacio/null => ninguna).
export function categoriasDe(u: UsuarioConPermisos): Categoria[] {
  if (esAdmin(u)) return [...CATEGORIAS];
  if (!u.categoriasPermitidas) return [];
  const set = new Set(
    u.categoriasPermitidas
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
  );
  return CATEGORIAS.filter((c) => set.has(c));
}

// Normaliza un arreglo de categorias a un CSV valido (solo categorias conocidas).
export function categoriasACsv(categorias: unknown): string {
  if (!Array.isArray(categorias)) return "";
  const set = new Set(CATEGORIAS as readonly string[]);
  const limpias = categorias
    .map((c) => String(c).trim().toUpperCase())
    .filter((c) => set.has(c));
  return Array.from(new Set(limpias)).join(",");
}
