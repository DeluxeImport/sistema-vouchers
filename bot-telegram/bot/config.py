"""Configuracion del bot, leida de variables de entorno (.env)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _env(nombre: str, por_defecto: str = "", requerido: bool = False) -> str:
    valor = os.environ.get(nombre, por_defecto)
    if requerido and not valor:
        raise RuntimeError(f"Falta la variable de entorno {nombre} (ver .env.example)")
    return valor


TELEGRAM_BOT_TOKEN = _env("TELEGRAM_BOT_TOKEN", requerido=True)
API_BASE_URL = _env("API_BASE_URL", "http://localhost:3000/api")
BOT_SERVICE_TOKEN = _env("BOT_SERVICE_TOKEN", requerido=True)

# Lista blanca de chat_id de grupos desde donde el bot acepta fotos.
# Vacio = sin restriccion (solo recomendado en desarrollo local).
_chat_ids_crudo = _env("CHAT_IDS_PERMITIDOS", "")
CHAT_IDS_PERMITIDOS = {c.strip() for c in _chat_ids_crudo.split(",") if c.strip()}
