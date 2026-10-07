"""Cliente HTTP hacia la API de Sistema Vouchers (endpoints /api/bot/*)."""
from typing import Optional

import httpx

from . import config


class ApiError(Exception):
    def __init__(self, status: int, mensaje: str):
        super().__init__(mensaje)
        self.status = status
        self.mensaje = mensaje


def _headers() -> dict:
    return {"Authorization": f"Bearer {config.BOT_SERVICE_TOKEN}"}


def _o_error(r: httpx.Response) -> dict:
    if r.status_code >= 400:
        try:
            mensaje = r.json().get("error", r.text)
        except Exception:
            mensaje = r.text
        raise ApiError(r.status_code, mensaje)
    return r.json()


async def vincular(token: str, telegram_user_id: str) -> dict:
    """Canjea el token de un solo uso generado desde el perfil web."""
    async with httpx.AsyncClient(base_url=config.API_BASE_URL, timeout=15) as client:
        r = await client.post(
            "/bot/vincular",
            json={"token": token, "telegramUserId": telegram_user_id},
            headers=_headers(),
        )
    return _o_error(r)


async def obtener_usuario(telegram_user_id: str) -> Optional[dict]:
    """Resuelve el usuario vinculado a este telegram_user_id, o None si no existe."""
    async with httpx.AsyncClient(base_url=config.API_BASE_URL, timeout=15) as client:
        r = await client.get(f"/bot/usuario/{telegram_user_id}", headers=_headers())
    if r.status_code == 404:
        return None
    return _o_error(r)


async def subir_voucher(
    telegram_user_id: str,
    categoria: str,
    chat_id: str,
    imagen: bytes,
    nombre_archivo: str,
    descripcion: Optional[str] = None,
    fecha: Optional[str] = None,
) -> dict:
    datos = {"telegramUserId": telegram_user_id, "categoria": categoria, "chatId": chat_id}
    if descripcion:
        datos["descripcion"] = descripcion
    if fecha:
        datos["fecha"] = fecha
    archivos = {"imagen": (nombre_archivo, imagen, "image/jpeg")}
    async with httpx.AsyncClient(base_url=config.API_BASE_URL, timeout=30) as client:
        r = await client.post("/bot/vouchers", data=datos, files=archivos, headers=_headers())
    return _o_error(r)
