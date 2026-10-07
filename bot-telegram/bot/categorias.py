"""
Espejo minimo de frontend/src/lib/categorias.ts y backend/src/config.ts
(repo sistema-vouchers): estructura contable de categorias.

El bot es un programa aparte y no puede importar ese TypeScript, asi que
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
    Grupo(
        "PERSONAL",
        "Pagos de Personal y Planilla",
        ("PER_VENTAS", "PER_PRACTICANTES", "PER_LEYES_SOCIALES", "PER_PLANILLA"),
    ),
    Grupo("RECOMPRAS", "Recompras", ("RECOMPRAS",)),
    Grupo("COSTO_VENTAS", "Compras y Mercaderia", ("CV_MERCADERIA", "CV_FLETES")),
    Grupo(
        "VENTAS_MARKETING",
        "Gastos de Ventas y Marketing",
        (
            "GV_PUBLICIDAD",
            "GV_BRANDING",
            "GV_ALQUILER_TIENDAS",
            "GV_MANT_TIENDAS",
            "GV_TIENDA_AGUA",
            "GV_TIENDA_LUZ",
            "GV_TIENDA_INTERNET",
            "GV_EMPAQUE",
            "GV_DELIVERY",
        ),
    ),
    Grupo(
        "ADMINISTRATIVOS",
        "Gastos Administrativos y Tecnologia",
        (
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
        ),
    ),
    Grupo("IMPUESTOS", "Impuestos y SUNAT", ("IMP_IGV", "IMP_RENTA", "IMP_FRACCIONAMIENTO")),
    Grupo("FINANCIEROS", "Gastos Financieros y Bancos", ("FIN_COMISIONES", "FIN_INTERESES", "FIN_AMORTIZACION")),
    Grupo("INVERSION", "Inversion y Activos Fijos", ("INV_MOBILIARIO", "INV_MEJORAS", "INV_EQUIPOS")),
    Grupo("PATRIMONIO", "Financiamiento y Patrimonio", ("PAT_AMORTIZACION", "PAT_SOCIOS")),
    Grupo("OTROS", "Otros Gastos", ("OTR_NO_OPERATIVOS", "OTR_TRANSFERENCIAS")),
)

# Categorias que solo aplican a vouchers (no se ofrecen para documentos).
SOLO_VOUCHER: tuple[str, ...] = ("OTR_TRANSFERENCIAS",)

# Tipos de documento: tambien son permisos (que documentos puede subir).
TIPOS_DOCUMENTO: tuple[str, ...] = ("NOTA", "FACTURA", "BOLETA")

LABELS: dict[str, str] = {
    "PER_VENTAS": "Personal de Ventas",
    "PER_PRACTICANTES": "Practicantes",
    "PER_LEYES_SOCIALES": "Leyes Sociales y Pensiones",
    "PER_PLANILLA": "Planilla",
    "RECOMPRAS": "Recompras",
    "CV_MERCADERIA": "Compras de Mercaderia",
    "CV_FLETES": "Fletes de Compra e Importaciones",
    "GV_PUBLICIDAD": "Publicidad Digital",
    "GV_BRANDING": "Branding, Diseno y Material POP",
    "GV_ALQUILER_TIENDAS": "Alquiler de Tiendas",
    "GV_MANT_TIENDAS": "Mantenimiento de Tiendas",
    "GV_TIENDA_AGUA": "Tiendas - Agua",
    "GV_TIENDA_LUZ": "Tiendas - Luz",
    "GV_TIENDA_INTERNET": "Tiendas - Internet",
    "GV_EMPAQUE": "Material de Empaque y Bolsas",
    "GV_DELIVERY": "Deliveries y Envios a Clientes",
    "GA_ALQUILER_OFICINA": "Alquiler de Oficina Principal",
    "GA_SUMINISTROS": "Suministros",
    "GA_LIMPIEZA": "Limpieza",
    "GA_OFICINA_AGUA": "Oficina - Agua",
    "GA_OFICINA_LUZ": "Oficina - Luz",
    "GA_OFICINA_INTERNET": "Oficina - Internet",
    "GA_HONORARIOS": "Honorarios y Asesorias",
    "GA_SOFTWARE": "Software, IA y Nube",
    "GA_SERVIDORES": "Servidores, Hosting y Dominios",
    "GA_EQUIPOS": "Equipos e Informatica",
    "GA_ATENCIONES": "Atenciones al Personal",
    "IMP_IGV": "IGV",
    "IMP_RENTA": "Impuesto a la Renta",
    "IMP_FRACCIONAMIENTO": "Fraccionamientos",
    "FIN_COMISIONES": "Comisiones Bancarias y Portales",
    "FIN_INTERESES": "Intereses y Portes de Prestamos",
    "FIN_AMORTIZACION": "Amortizacion de Deuda",
    "INV_MOBILIARIO": "Mobiliario y Equipamiento",
    "INV_MEJORAS": "Mejoras y Remodelaciones",
    "INV_EQUIPOS": "Equipos de Computo / Maquinaria",
    "PAT_AMORTIZACION": "Amortizacion de Deuda",
    "PAT_SOCIOS": "Retiros y Aportes de Socio",
    "OTR_NO_OPERATIVOS": "No Operativos e Imprevistos",
    "OTR_TRANSFERENCIAS": "Transferencias entre Cuentas Propias",
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


def subcategorias_permitidas(grupo: Grupo, permitidas: list[str], solo_documento: bool = False) -> list[str]:
    """Subcategorias del grupo que la persona puede usar (sin las exclusivas
    de vouchers si esta subiendo un documento)."""
    permitidas_set = set(permitidas)
    return [
        c
        for c in grupo.subcategorias
        if c in permitidas_set and not (solo_documento and c in SOLO_VOUCHER)
    ]


def grupos_permitidos(permitidas: list[str], solo_documento: bool = False) -> list[Grupo]:
    return [g for g in GRUPOS if subcategorias_permitidas(g, permitidas, solo_documento)]


def tipos_permitidos(permitidas: list[str]) -> list[str]:
    """Tipos de documento que puede subir (solo si ademas tiene alguna
    categoria utilizable en documentos)."""
    if not grupos_permitidos(permitidas, solo_documento=True):
        return []
    return [t for t in TIPOS_DOCUMENTO if t in permitidas]
