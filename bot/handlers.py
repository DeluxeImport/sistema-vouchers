"""Manejadores de comandos, fotos, botones y texto libre del bot."""
import asyncio
import logging
from datetime import datetime

from telegram import Update
from telegram.error import Forbidden
from telegram.ext import ContextTypes

from . import api_client, config, estado, extraccion
from .categorias import etiqueta
from .teclados import teclado_categorias, teclado_fecha_detectada, teclado_si_no, teclado_subcategorias

log = logging.getLogger(__name__)


def _fmt_fecha(fecha_iso: str) -> str:
    """YYYY-MM-DD -> DD/MM/AAAA, para mostrarsela a la persona."""
    return datetime.strptime(fecha_iso, "%Y-%m-%d").strftime("%d/%m/%Y")


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


async def _verificar_autorizado(update: Update, pendiente: "estado.Pendiente") -> bool:
    """Solo el autor de la foto, o un admin, puede continuar esta subida."""
    quien = str(update.effective_user.id)
    if quien == pendiente.telegram_user_id:
        return True
    usuario_que_toca = await api_client.obtener_usuario(quien)
    return bool(usuario_que_toca and usuario_que_toca.get("esAdmin"))


async def _descargar_imagen(context: ContextTypes.DEFAULT_TYPE, file_id: str) -> bytes:
    archivo = await context.bot.get_file(file_id)
    return bytes(await archivo.download_as_bytearray())


async def _preguntar_fecha(context: ContextTypes.DEFAULT_TYPE, chat_id: str, sesion_id: str, pendiente) -> None:
    """Descarga la foto (una sola vez, se reutiliza para la subida final),
    intenta detectar la fecha (QR -> OCR) y le pregunta a la persona segun
    el resultado."""
    if pendiente.imagen is None:
        pendiente.imagen = await _descargar_imagen(context, pendiente.file_id)

    loop = asyncio.get_running_loop()
    # detectar_fecha es sincrona y puede tardar (el OCR de respaldo sobre
    # todo): se corre en un hilo aparte para no trabar el resto del bot.
    fecha = await loop.run_in_executor(None, extraccion.detectar_fecha, pendiente.imagen)

    if fecha:
        pendiente.fecha = fecha
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"Fecha detectada: {_fmt_fecha(fecha)}",
            reply_markup=teclado_fecha_detectada(sesion_id),
        )
    else:
        pendiente.esperando_texto = "fecha"
        await context.bot.send_message(
            chat_id=chat_id,
            text="No pude leer la fecha del comprobante. Escribela (formato DD/MM/AAAA), "
            "o manda \"omitir\" para dejarla en blanco.",
        )


async def _preguntar_nota(context: ContextTypes.DEFAULT_TYPE, chat_id: str, sesion_id: str) -> None:
    await context.bot.send_message(
        chat_id=chat_id,
        text="¿Quieres dejar una nota para este comprobante?",
        reply_markup=teclado_si_no(sesion_id, "nota"),
    )


async def _finalizar_subida(context: ContextTypes.DEFAULT_TYPE, sesion_id: str, pendiente) -> None:
    try:
        resultado = await api_client.subir_voucher(
            telegram_user_id=pendiente.telegram_user_id,
            categoria=pendiente.categoria,
            chat_id=pendiente.chat_id,
            imagen=pendiente.imagen,
            nombre_archivo=f"{pendiente.file_id}.jpg",
            descripcion=pendiente.descripcion,
            fecha=pendiente.fecha,
        )
        voucher_id = resultado.get("voucher", {}).get("voucherId", "?")
        partes = [f"Listo: {voucher_id} ({etiqueta(pendiente.categoria)})"]
        if pendiente.fecha:
            partes.append(f"Fecha: {_fmt_fecha(pendiente.fecha)}")
        if pendiente.descripcion:
            partes.append(f"Nota: {pendiente.descripcion}")
        await context.bot.send_message(chat_id=pendiente.chat_id, text="\n".join(partes))
    except api_client.ApiError as e:
        await context.bot.send_message(chat_id=pendiente.chat_id, text=f"No se pudo subir: {e.mensaje}")
    finally:
        estado.eliminar(sesion_id)


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

    if not await _verificar_autorizado(update, pendiente):
        await query.answer("No puedes usar este boton.", show_alert=True)
        return

    await query.answer()

    if accion == "volver":
        await query.edit_message_text(
            "¿A que categoria corresponde este comprobante?",
            reply_markup=teclado_categorias(sesion_id, pendiente.categorias_permitidas),
        )
        return

    if accion == "grp":
        await query.edit_message_reply_markup(
            reply_markup=teclado_subcategorias(sesion_id, valor, pendiente.categorias_permitidas)
        )
        return

    if accion == "cat":
        pendiente.categoria = valor
        await query.edit_message_text(f"Categoria: {etiqueta(valor)}. Buscando la fecha en la foto...")
        await _preguntar_fecha(context, pendiente.chat_id, sesion_id, pendiente)
        return

    if accion == "fecha_ok":
        await query.edit_message_reply_markup(reply_markup=None)
        await _preguntar_nota(context, pendiente.chat_id, sesion_id)
        return

    if accion == "fecha_corregir":
        pendiente.esperando_texto = "fecha"
        await query.edit_message_text("Escribe la fecha correcta (formato DD/MM/AAAA), o \"omitir\" para dejarla en blanco.")
        return

    if accion == "nota_si":
        pendiente.esperando_texto = "nota"
        await query.edit_message_text("Escribe la nota.")
        return

    if accion == "nota_no":
        await query.edit_message_reply_markup(reply_markup=None)
        await context.bot.send_message(chat_id=pendiente.chat_id, text="Subiendo...")
        await _finalizar_subida(context, sesion_id, pendiente)
        return


async def texto_recibido(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Captura la fecha o la nota cuando la persona las escribe a mano (en
    vez de tocar un boton). Si no hay ninguna subida pendiente esperando
    texto de este usuario, ignora el mensaje -- puede ser charla suelta."""
    telegram_user_id = str(update.effective_user.id)
    encontrado = estado.buscar_por_usuario_esperando_texto(telegram_user_id)
    if encontrado is None:
        return
    sesion_id, pendiente = encontrado
    texto = (update.message.text or "").strip()

    if pendiente.esperando_texto == "fecha":
        if texto.lower() in ("omitir", "ninguna", "no", "-"):
            pendiente.fecha = None
        else:
            fecha = extraccion.fecha_de_texto(texto)
            if fecha is None:
                await update.message.reply_text(
                    "No entendi esa fecha. Prueba con el formato DD/MM/AAAA, o escribe \"omitir\"."
                )
                return  # se queda esperando el mismo texto, no avanza
            pendiente.fecha = fecha
        pendiente.esperando_texto = None
        await _preguntar_nota(context, pendiente.chat_id, sesion_id)
        return

    if pendiente.esperando_texto == "nota":
        pendiente.descripcion = texto[:500] or None
        pendiente.esperando_texto = None
        await update.message.reply_text("Subiendo...")
        await _finalizar_subida(context, sesion_id, pendiente)
        return
