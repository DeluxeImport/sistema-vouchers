"""
Deteccion de regiones del comprobante con YOLO (ultralytics).

YOLO no lee texto: solo ubica DONDE esta cada cosa en la foto. Aca se usa
para recortar el comprobante (dejando afuera billetes, mesa, etc.) y el
campo de la fecha, para que el OCR lea solo eso y no el resto de la imagen.

Necesita un modelo entrenado con fotos propias (ver entrenamiento/README.md).
Mientras no exista el archivo del modelo, detectar_regiones() devuelve {} y
la extraccion sigue funcionando igual que antes, con el OCR sobre la foto
completa.
"""
import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)

# Clases del modelo, en el mismo orden que entrenamiento/preparar_dataset.py.
CLASES = ("comprobante", "fecha", "monto")

_RUTA_POR_DEFECTO = Path(__file__).resolve().parent.parent / "modelos" / "comprobantes.pt"
_CONFIANZA_MINIMA = 0.4
# Margen alrededor de cada caja: YOLO tiende a recortar justo al borde y el
# OCR lee peor un numero cortado por la mitad.
_MARGEN = 0.10

_modelo = None
_modelo_cargado = False  # se intenta cargar una sola vez


def _ruta_modelo() -> Path:
    return Path(os.environ.get("YOLO_MODELO") or _RUTA_POR_DEFECTO)


def _obtener_modelo():
    global _modelo, _modelo_cargado
    if _modelo_cargado:
        return _modelo
    _modelo_cargado = True
    ruta = _ruta_modelo()
    if not ruta.exists():
        log.info("Sin modelo YOLO en %s: se usa OCR sobre la foto completa", ruta)
        return None
    try:
        from ultralytics import YOLO

        _modelo = YOLO(str(ruta))
        log.info("Modelo YOLO cargado: %s", ruta)
    except Exception:
        log.exception("No se pudo cargar el modelo YOLO %s; se sigue sin el", ruta)
        _modelo = None
    return _modelo


def _recortar(img, caja):
    alto, ancho = img.shape[:2]
    x1, y1, x2, y2 = caja
    mx, my = (x2 - x1) * _MARGEN, (y2 - y1) * _MARGEN
    x1, y1 = max(0, int(x1 - mx)), max(0, int(y1 - my))
    x2, y2 = min(ancho, int(x2 + mx)), min(alto, int(y2 + my))
    return img[y1:y2, x1:x2]


def detectar_regiones(img) -> dict[str, list]:
    """
    Devuelve {clase: [recortes de imagen]} con los recortes de cada clase
    ordenados de mayor a menor confianza. {} si no hay modelo o si falla.
    """
    modelo = _obtener_modelo()
    if modelo is None:
        return {}
    try:
        resultado = modelo.predict(img, conf=_CONFIANZA_MINIMA, verbose=False)[0]
    except Exception:
        log.exception("Fallo la deteccion YOLO; se sigue sin ella")
        return {}

    encontrados: dict[str, list[tuple[float, object]]] = {}
    for caja, clase, confianza in zip(
        resultado.boxes.xyxy.tolist(), resultado.boxes.cls.tolist(), resultado.boxes.conf.tolist()
    ):
        nombre = resultado.names.get(int(clase))
        recorte = _recortar(img, caja)
        if nombre and recorte.size:
            encontrados.setdefault(nombre, []).append((confianza, recorte))

    return {
        nombre: [r for _c, r in sorted(lista, key=lambda x: x[0], reverse=True)]
        for nombre, lista in encontrados.items()
    }
