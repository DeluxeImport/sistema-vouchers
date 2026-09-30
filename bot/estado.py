"""
Estado en memoria de las subidas pendientes: una foto ya llego y esta
esperando que la persona elija categoria/subcategoria con los botones.

Vive solo mientras el proceso del bot esta corriendo -- si se reinicia, las
subidas pendientes se pierden y la persona tendria que volver a mandar la
foto. Suficiente para Fase 1 (sin OCR); si mas adelante el volumen lo pide,
esto se puede mover a Redis o a la base de datos sin cambiar la interfaz.
"""
import secrets
from dataclasses import dataclass, field
from time import time
from typing import Optional

MINUTOS_EXPIRACION = 10


@dataclass
class Pendiente:
    telegram_user_id: str
    chat_id: str
    file_id: str
    mensaje_id: int
    categorias_permitidas: list[str]
    creado_en: float = field(default_factory=time)


_pendientes: dict[str, Pendiente] = {}


def crear(
    telegram_user_id: str,
    chat_id: str,
    file_id: str,
    mensaje_id: int,
    categorias_permitidas: list[str],
) -> str:
    _limpiar_vencidos()
    sesion_id = secrets.token_hex(4)  # 8 caracteres: corto para caber en callback_data
    _pendientes[sesion_id] = Pendiente(telegram_user_id, chat_id, file_id, mensaje_id, categorias_permitidas)
    return sesion_id


def obtener(sesion_id: str) -> Optional[Pendiente]:
    _limpiar_vencidos()
    return _pendientes.get(sesion_id)


def eliminar(sesion_id: str) -> None:
    _pendientes.pop(sesion_id, None)


def _limpiar_vencidos() -> None:
    limite = time() - MINUTOS_EXPIRACION * 60
    vencidos = [sid for sid, p in _pendientes.items() if p.creado_en < limite]
    for sid in vencidos:
        _pendientes.pop(sid, None)
