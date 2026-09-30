"""Manejadores de comandos, fotos y botones del bot."""
import logging

from telegram import Update
from telegram.error import Forbidden
from telegram.ext import ContextTypes

from . import api_client, config, estado
from .categorias import etiqueta
from .teclados import teclado_categorias, teclado_subcategorias

log = logging.getLogger(__name__)


async def comando_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args
    if not args:
        await update.message.reply_text(
            "Hola. Para vincular tu cuenta, entra a Sistema Vouchers -> Perfil -> "
            "\"Vincular Telegram\" y toca el enlace que te genera ahi."
        )
        return

    token = args[0]
    telegram_user_id = str(update.effective_user.id)
    try:
        resultado = await api_client.vincular(token, telegram_user_id)
    except api_client.ApiError as e:
        await update.message.reply_text(f"No se pudo vincular: {e.mensaje}")
        return

    nombre = resultado.get("usuario", {}).get("nombre", "")
    await update.message.reply_text(
        f"Cuenta vinculada correctamente, {nombre}. Ya puedes mandar fotos de comprobantes aqui."
    )


async def foto_recibida(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    mensaje = update.message
    chat_id = str(mensaje.chat_id)

    # Lista blanca de grupos (vacia = sin restriccion, solo en desarrollo).
    if config.CHAT_IDS_PERMITIDOS and chat_id not in config.CHAT_IDS_PERMITIDOS:
        return

    telegram_user_id = str(update.effective_user.id)
    usuario = await api_client.obtener_usuario(telegram_user_id)
    if usuario is None:
        # Se ignora la foto en el grupo; se avisa en privado si es posible.
        try:
            await context.bot.send_message(
                chat_id=update.effective_user.id,
                text="Tu cuenta de Telegram no esta vinculada todavia. Entra a Sistema "
                "Vouchers -> Perfil -> \"Vincular Telegram\" para poder subir comprobantes por aqui.",
            )
        except Forbidden:
            log.info("No se pudo avisar por privado a %s (no inicio chat con el bot)", telegram_user_id)
        return

    if not usuario.get("puedeSubir"):
        await mensaje.reply_text("Tu usuario no tiene permiso para subir comprobantes.")
        return

    permitidas = usuario.get("categorias", [])
    if not permitidas:
        await mensaje.reply_text("No tienes ninguna categoria habilitada para subir. Contacta al administrador.")
        return

    foto = mensaje.photo[-1]  # la de mayor resolucion
    sesion_id = estado.crear(
        telegram_user_id=telegram_user_id,
        chat_id=chat_id,
        file_id=foto.file_id,
        mensaje_id=mensaje.message_id,
        categorias_permitidas=permitidas,
    )
    await mensaje.reply_text(
        "¿A que categoria corresponde este comprobante?",
        reply_to_message_id=mensaje.message_id,
        reply_markup=teclado_categorias(sesion_id, permitidas),
    )


async def boton_pulsado(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    partes = (query.data or "").split(":", 2)
    accion = partes[0] if len(partes) > 0 else ""
    sesion_id = partes[1] if len(partes) > 1 else ""
    valor = partes[2] if len(partes) > 2 else ""

    pendiente = estado.obtener(sesion_id)
    if pendiente is None:
        await query.answer("Esta solicitud ya vencio, manda la foto de nuevo.", show_alert=True)
        return

    # Solo el autor de la foto (o un admin) puede usar estos botones.
    quien_toca = str(update.effective_user.id)
    if quien_toca != pendiente.telegram_user_id:
        usuario_que_toca = await api_client.obtener_usuario(quien_toca)
        if not usuario_que_toca or not usuario_que_toca.get("esAdmin"):
            await query.answer("No puedes usar este boton.", show_alert=True)
            return

    await query.answer()

    if accion == "volver":
        await query.edit_message_reply_markup(reply_markup=teclado_categorias(sesion_id, pendiente.categorias_permitidas))
        return

    if accion == "grp":
        await query.edit_message_reply_markup(
            reply_markup=teclado_subcategorias(sesion_id, valor, pendiente.categorias_permitidas)
        )
        return

    if accion == "cat":
        categoria = valor
        await query.edit_message_text(f"Subiendo como {etiqueta(categoria)}...")
        archivo = await context.bot.get_file(pendiente.file_id)
        imagen = bytes(await archivo.download_as_bytearray())
        try:
            resultado = await api_client.subir_voucher(
                telegram_user_id=pendiente.telegram_user_id,
                categoria=categoria,
                chat_id=pendiente.chat_id,
                imagen=imagen,
                nombre_archivo=f"{pendiente.file_id}.jpg",
            )
            voucher_id = resultado.get("voucher", {}).get("voucherId", "?")
            await query.edit_message_text(f"Listo: {voucher_id} ({etiqueta(categoria)})")
        except api_client.ApiError as e:
            await query.edit_message_text(f"No se pudo subir: {e.mensaje}")
        finally:
            estado.eliminar(sesion_id)
