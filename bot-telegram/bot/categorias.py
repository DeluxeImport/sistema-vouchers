"""
Espejo minimo de frontend/src/lib/categorias.ts (repo sistema-vouchers).

El bot vive en un proyecto aparte y no puede importar ese TypeScript, asi que
esto se mantiene a mano. Si se agrega, quita o renombra una categoria alla,
hay que reflejarlo aqui tambien.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Grupo:
    id: str
    label: str
    subcategorias: tuple[str, ...]


GRUPOS: tuple[Grupo, ...] = (
    Grupo("compras", "Compras", ("COMPRAS_PROVEEDORES", "COMPRAS_OFICINA")),
    Grupo(
        "servicios",
        "Servicios",
        ("SERVICIOS_LUZ", "SERVICIOS_AGUA", "SERVICIOS_MANTENIMIENTO", "SERVICIOS_INTERNET"),
    ),
    Grupo(
        "servicios_fijos",
        "Servicios Fijos",
        ("SFIJOS_CELULAR", "SFIJOS_CAMARA", "SFIJOS_PRESUPUESTO", "SFIJOS_FLETE"),
    ),
)

# Categorias sin subcategorias: se eligen directo, sin un paso intermedio.
CATEGORIAS_SUELTAS: tuple[str, ...] = ("RECOMPRAS", "ALQUILER")
CATEGORIAS_DOCUMENTO: tuple[str, ...] = ("NOTA", "FACTURA", "BOLETA")

LABELS: dict[str, str] = {
    "COMPRAS": "Compras",
    "SERVICIOS": "Servicios",
    "COMPRAS_PROVEEDORES": "Proveedores",
    "COMPRAS_OFICINA": "Oficina",
    "SERVICIOS_LUZ": "Luz",
    "SERVICIOS_AGUA": "Agua",
    "SERVICIOS_MANTENIMIENTO": "Mantenimiento",
    "SERVICIOS_INTERNET": "Internet",
    "SFIJOS_CELULAR": "Pago Celular",
    "SFIJOS_CAMARA": "Camara de Comercio",
    "SFIJOS_PRESUPUESTO": "Presupuesto Varios",
    "SFIJOS_FLETE": "Flete",
    "RECOMPRAS": "Recompras",
    "ALQUILER": "Alquiler",
    "NOTA": "Nota",
    "FACTURA": "Factura",
    "BOLETA": "Boleta",
}


def etiqueta(categoria: str) -> str:
    return LABELS.get(categoria, categoria)


def grupo_de(categoria: str) -> Optional[Grupo]:
    for g in GRUPOS:
        if categoria in g.subcategorias:
            return g
    return None
