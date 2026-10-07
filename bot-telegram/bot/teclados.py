"""Teclados inline para elegir categoria y, si aplica, subcategoria."""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from .categorias import CATEGORIAS_DOCUMENTO, CATEGORIAS_SUELTAS, GRUPOS, etiqueta


def teclado_categorias(sesion_id: str, permitidas: list[str]) -> InlineKeyboardMarkup:
    permitidas_set = set(permitidas)
    filas: list[list[InlineKeyboardButton]] = []

    # Un boton por grupo (Compras/Servicios/Servicios Fijos) si la persona
    # tiene al menos una subcategoria permitida ahi; el siguiente paso las abre.
    for g in GRUPOS:
        if any(c in permitidas_set for c in g.subcategorias):
            filas.append([InlineKeyboardButton(g.label, callback_data=f"grp:{sesion_id}:{g.id}")])

    # Categorias sin subcategorias: boton directo, de a dos por fila.
    sueltas = [c for c in (*CATEGORIAS_SUELTAS, *CATEGORIAS_DOCUMENTO) if c in permitidas_set]
    for i in range(0, len(sueltas), 2):
        par = sueltas[i : i + 2]
        filas.append([InlineKeyboardButton(etiqueta(c), callback_data=f"cat:{sesion_id}:{c}") for c in par])

    return InlineKeyboardMarkup(filas)


def teclado_fecha_detectada(sesion_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("✓ Confirmar", callback_data=f"fecha_ok:{sesion_id}:"),
                InlineKeyboardButton("✎ Corregir", callback_data=f"fecha_corregir:{sesion_id}:"),
            ]
        ]
    )


def teclado_si_no(sesion_id: str, prefijo: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Sí", callback_data=f"{prefijo}_si:{sesion_id}:"),
                InlineKeyboardButton("No", callback_data=f"{prefijo}_no:{sesion_id}:"),
            ]
        ]
    )


def teclado_subcategorias(sesion_id: str, grupo_id: str, permitidas: list[str]) -> InlineKeyboardMarkup:
    permitidas_set = set(permitidas)
    grupo = next(g for g in GRUPOS if g.id == grupo_id)
    opciones = [c for c in grupo.subcategorias if c in permitidas_set]

    filas: list[list[InlineKeyboardButton]] = []
    for i in range(0, len(opciones), 2):
        par = opciones[i : i + 2]
        filas.append([InlineKeyboardButton(etiqueta(c), callback_data=f"cat:{sesion_id}:{c}") for c in par])
    filas.append([InlineKeyboardButton("« Volver", callback_data=f"volver:{sesion_id}")])

    return InlineKeyboardMarkup(filas)
