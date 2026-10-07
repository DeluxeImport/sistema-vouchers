"""Teclados inline: tipo (voucher o documento), categoria principal y subcategoria."""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from .categorias import GRUPOS, etiqueta, grupos_permitidos, subcategorias_permitidas, tipos_permitidos


def teclado_tipos(sesion_id: str, permitidas: list[str]) -> InlineKeyboardMarkup:
    """Primer paso cuando la persona puede subir documentos: voucher o
    documento (nota / factura / boleta)."""
    filas: list[list[InlineKeyboardButton]] = []
    if grupos_permitidos(permitidas):
        filas.append([InlineKeyboardButton("Voucher (pago)", callback_data=f"tipo:{sesion_id}:VOUCHER")])
    tipos = tipos_permitidos(permitidas)
    if tipos:
        filas.append([InlineKeyboardButton(etiqueta(t), callback_data=f"tipo:{sesion_id}:{t}") for t in tipos])
    return InlineKeyboardMarkup(filas)


def teclado_categorias(
    sesion_id: str, permitidas: list[str], solo_documento: bool = False, con_volver: bool = False
) -> InlineKeyboardMarkup:
    filas: list[list[InlineKeyboardButton]] = []

    # Un boton por categoria principal con al menos una subcategoria permitida.
    # Si solo tiene una (ej. Recompras) se elige directo, sin paso intermedio.
    for g in grupos_permitidos(permitidas, solo_documento):
        subcategorias = subcategorias_permitidas(g, permitidas, solo_documento)
        if len(g.subcategorias) == 1:
            filas.append([InlineKeyboardButton(g.label, callback_data=f"cat:{sesion_id}:{subcategorias[0]}")])
        else:
            filas.append([InlineKeyboardButton(g.label, callback_data=f"grp:{sesion_id}:{g.id}")])

    if con_volver:
        filas.append([InlineKeyboardButton("« Cambiar tipo", callback_data=f"inicio:{sesion_id}")])
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


def teclado_subcategorias(
    sesion_id: str, grupo_id: str, permitidas: list[str], solo_documento: bool = False
) -> InlineKeyboardMarkup:
    grupo = next(g for g in GRUPOS if g.id == grupo_id)
    opciones = subcategorias_permitidas(grupo, permitidas, solo_documento)

    # Una por fila: las etiquetas contables son largas y Telegram las cortaria.
    filas = [[InlineKeyboardButton(etiqueta(c), callback_data=f"cat:{sesion_id}:{c}")] for c in opciones]
    filas.append([InlineKeyboardButton("« Volver", callback_data=f"volver:{sesion_id}")])

    return InlineKeyboardMarkup(filas)
