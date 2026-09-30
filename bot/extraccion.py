"""
Deteccion de la fecha del comprobante a partir de la foto.

Orden: primero el codigo QR (mucho mas confiable en facturas/boletas
electronicas peruanas, formato SUNAT), y solo si no hay QR o no trae una
fecha valida, se cae a OCR sobre el texto de la imagen.

Nota sobre el motor de OCR: el documento original pedia PaddleOCR, pero esa
libreria (via su dependencia paddlepaddle) no publica version para Python
3.14, que es la unica disponible en esta maquina -- no se pudo instalar. Se
uso EasyOCR en su lugar (mismo proposito: OCR con soporte de espanol,
instalable solo con pip, sin binarios externos). Si mas adelante se corre el
bot con un Python mas viejo, se puede volver a PaddleOCR sin tocar el resto
del flujo (esta funcion es el unico lugar que sabe cual motor usa).
"""
import re
from datetime import datetime
from typing import Optional

import cv2
import numpy as np

_detector_qr = cv2.QRCodeDetector()
_lector_ocr = None  # se crea recien al primer uso (carga modelos, es lento)


def _decodificar_imagen(imagen_bytes: bytes):
    arr = np.frombuffer(imagen_bytes, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def _leer_qr(imagen_bytes: bytes) -> Optional[str]:
    img = _decodificar_imagen(imagen_bytes)
    if img is None:
        return None
    datos, _puntos, _rectificada = _detector_qr.detectAndDecode(img)
    return datos or None


def fecha_de_qr_sunat(datos_qr: str) -> Optional[str]:
    """
    QR de factura/boleta electronica (formato SUNAT, Peru):
    RUC|TipoDoc|Serie|Numero|IGV|Total|FechaEmision|TipoDocCliente|NumDocCliente|...
    El campo 7 (indice 6) es la fecha de emision, en YYYY-MM-DD.
    Devuelve esa fecha si el QR calza con el formato, o None si no.
    """
    campos = datos_qr.split("|")
    if len(campos) < 7:
        return None
    fecha = campos[6].strip()
    try:
        datetime.strptime(fecha, "%Y-%m-%d")
    except ValueError:
        return None
    return fecha


_MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "setiembre": 9, "septiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}

# Separador tolerante: el OCR a veces confunde "/" con "," "'" "." etc.
_SEP = r"\s*[/\-.,'´ʼ]\s*"
_PATRON_NUMERICO = re.compile(r"\b(\d{1,2})" + _SEP + r"(\d{1,2})" + _SEP + r"(\d{2,4})\b")
_PATRON_TEXTO = re.compile(
    r"\b(\d{1,2})\s+de\s+(" + "|".join(_MESES) + r")\s+de\s+(\d{4})\b", re.IGNORECASE
)


def fecha_de_texto(texto: str) -> Optional[str]:
    """Busca una fecha en espanol dentro de un texto libre (salida de OCR).
    Devuelve YYYY-MM-DD, o None si no encuentra nada que parezca fecha valida."""
    m = _PATRON_NUMERICO.search(texto)
    if m:
        dia, mes, anio = m.groups()
        if len(anio) == 2:
            anio = "20" + anio
        try:
            return datetime(int(anio), int(mes), int(dia)).strftime("%Y-%m-%d")
        except ValueError:
            pass  # sigue con el patron de texto, puede que calce ahi

    m = _PATRON_TEXTO.search(texto)
    if m:
        dia, mes_texto, anio = m.groups()
        mes = _MESES[mes_texto.lower()]
        try:
            return datetime(int(anio), mes, int(dia)).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def _obtener_lector_ocr():
    global _lector_ocr
    if _lector_ocr is None:
        import easyocr

        _lector_ocr = easyocr.Reader(["es"], gpu=False, verbose=False)
    return _lector_ocr


def _leer_texto_ocr(imagen_bytes: bytes) -> str:
    img = _decodificar_imagen(imagen_bytes)
    if img is None:
        return ""
    lineas = _obtener_lector_ocr().readtext(img, detail=0)
    return "\n".join(lineas)


def detectar_fecha(imagen_bytes: bytes) -> Optional[str]:
    """
    Punto de entrada: intenta QR primero, despues OCR. Devuelve la fecha en
    YYYY-MM-DD, o None si no se pudo detectar por ningun medio.

    Es una funcion sincrona (bloqueante, sobre todo el OCR) -- quien la llama
    desde un handler async debe correrla en un executor para no trabar el
    event loop del bot mientras dura.
    """
    qr = _leer_qr(imagen_bytes)
    if qr:
        fecha = fecha_de_qr_sunat(qr)
        if fecha:
            return fecha

    try:
        texto = _leer_texto_ocr(imagen_bytes)
    except Exception:
        return None
    return fecha_de_texto(texto)
