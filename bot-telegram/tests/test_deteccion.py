import io

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from bot import deteccion, extraccion


def _sin_modelo_cargado(monkeypatch, ruta):
    monkeypatch.setenv("YOLO_MODELO", str(ruta))
    monkeypatch.setattr(deteccion, "_modelo", None)
    monkeypatch.setattr(deteccion, "_modelo_cargado", False)


def test_sin_modelo_no_detecta_nada(monkeypatch, tmp_path):
    _sin_modelo_cargado(monkeypatch, tmp_path / "no-existe.pt")
    assert deteccion.detectar_regiones(np.zeros((100, 100, 3), dtype=np.uint8)) == {}


def test_modelo_corrupto_no_rompe_el_bot(monkeypatch, tmp_path):
    corrupto = tmp_path / "corrupto.pt"
    corrupto.write_bytes(b"esto no es un modelo")
    _sin_modelo_cargado(monkeypatch, corrupto)
    assert deteccion.detectar_regiones(np.zeros((100, 100, 3), dtype=np.uint8)) == {}


def test_recorte_agrega_margen_sin_salirse_de_la_imagen():
    img = np.zeros((100, 200, 3), dtype=np.uint8)
    assert deteccion._recortar(img, (10, 10, 110, 60)).shape[:2] == (60, 120)
    assert deteccion._recortar(img, (0, 0, 200, 100)).shape[:2] == (100, 200)


def _png_con_dos_fechas() -> tuple[bytes, tuple[int, int, int, int]]:
    """Foto con la fecha del comprobante arriba y otra fecha distinta abajo
    (como un billete): en la foto completa es ambigua."""
    fuente = ImageFont.truetype("arial.ttf", 28)
    img = Image.new("RGB", (600, 240), "white")
    dibujo = ImageDraw.Draw(img)
    dibujo.text((10, 30), "Fecha 15/03/2026", fill="black", font=fuente)
    dibujo.text((10, 160), "Vence 20/04/2026", fill="black", font=fuente)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), (0, 15, 400, 80)


def test_con_zona_de_fecha_detectada_lee_solo_esa_zona(monkeypatch):
    imagen, (x1, y1, x2, y2) = _png_con_dos_fechas()
    assert extraccion.detectar_fecha(imagen) is None  # sin YOLO: ambigua

    def detector_falso(img):
        return {"fecha": [img[y1:y2, x1:x2]]}

    monkeypatch.setattr(deteccion, "detectar_regiones", detector_falso)
    assert extraccion.detectar_fecha(imagen) == "2026-03-15"


def test_si_la_zona_no_tiene_fecha_sigue_con_la_foto_completa(monkeypatch):
    fuente = ImageFont.truetype("arial.ttf", 28)
    img = Image.new("RGB", (600, 120), "white")
    ImageDraw.Draw(img).text((10, 40), "Fecha 15/03/2026", fill="black", font=fuente)
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    blanco = np.full((40, 100, 3), 255, dtype=np.uint8)
    monkeypatch.setattr(deteccion, "detectar_regiones", lambda img: {"fecha": [blanco]})
    assert extraccion.detectar_fecha(buf.getvalue()) == "2026-03-15"
