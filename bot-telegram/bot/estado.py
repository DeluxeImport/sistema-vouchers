"""
Estado en memoria de las subidas pendientes: una foto ya llego y esta
avanzando por los pasos -- elegir categoria, confirmar/escribir la fecha,
decidir si deja una nota -- antes de subirse a Sistema Vouchers.

Vive solo mientras el proceso del bot esta corriendo -- si se reinicia, las
subidas pendientes se pierden y la persona tendria que volver a mandar la
foto. Suficiente para Fase 1/2; si mas adelante el volumen lo pide, esto se
puede mover a Redis o a la base de datos sin cambiar la interfaz.
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
    categoria: Optional[str] = None
    fecha: Optional[str] = None  # YYYY-MM-DD, o None si se omite
    descripcion: Optional[str] = None
    imagen: Optional[bytes] = None  # bytes de la foto ya descargada (se reutiliza, no se pide dos veces)
    # Si esta esperando que la persona escriba algo (en vez de tocar un
    # boton): "fecha" o "nota". None = no esta esperando texto.
    esperando_texto: Optional[str] = None
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


def buscar_por_usuario_esperando_texto(telegram_user_id: str) -> Optional[tuple[str, Pendiente]]:
    """Encuentra la subida pendiente de este usuario que esta esperando que
    escriba algo (fecha o nota). Si hay varias (no deberia pasar en uso
    normal), devuelve la mas reciente."""
    _limpiar_vencidos()
    candidatas = [
        (sid, p)
        for sid, p in _pendientes.items()
        if p.telegram_user_id == telegram_user_id and p.esperando_texto is not None
    ]
    if not candidatas:
        return None
    return max(candidatas, key=lambda par: par[1].creado_en)


def eliminar(sesion_id: str) -> None:
    _pendientes.pop(sesion_id, None)


def _limpiar_vencidos() -> None:
    limite = time() - MINUTOS_EXPIRACION * 60
    vencidos = [sid for sid, p in _pendientes.items() if p.creado_en < limite]
    for sid in vencidos:
        _pendientes.pop(sid, None)
