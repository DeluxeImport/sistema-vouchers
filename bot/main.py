"""Punto de entrada: arma la aplicacion de Telegram y registra los handlers."""
import logging

from telegram.ext import Application, CallbackQueryHandler, CommandHandler, MessageHandler, filters

from . import config, handlers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)  # no loguear cada llamada a la API


def main() -> None:
    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", handlers.comando_start))
    app.add_handler(MessageHandler(filters.PHOTO, handlers.foto_recibida))
    app.add_handler(CallbackQueryHandler(handlers.boton_pulsado))

    logging.info("Bot arrancando (polling)...")
    app.run_polling()


if __name__ == "__main__":
    main()
