import io

import qrcode

from bot.extraccion import detectar_fecha, fecha_de_qr_sunat, fecha_de_texto


def _png_de_qr(contenido: str) -> bytes:
    img = qrcode.make(contenido)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# --- fecha_de_qr_sunat -------------------------------------------------


def test_fecha_de_qr_sunat_formato_valido():
    qr = "20123456789|01|F001|123|18.00|118.00|2026-03-15|6|20999999999|"
    assert fecha_de_qr_sunat(qr) == "2026-03-15"


def test_fecha_de_qr_sunat_pocos_campos_devuelve_none():
    assert fecha_de_qr_sunat("20123456789|01|F001") is None


def test_fecha_de_qr_sunat_fecha_invalida_devuelve_none():
    qr = "20123456789|01|F001|123|18.00|118.00|no-es-fecha|6|20999999999|"
    assert fecha_de_qr_sunat(qr) is None


def test_fecha_de_qr_sunat_contenido_que_no_es_un_qr_de_comprobante():
    assert fecha_de_qr_sunat("https://ejemplo.com") is None


# --- fecha_de_texto (salida de OCR, con ruido tipico) -------------------


def test_fecha_de_texto_formato_dd_mm_aaaa():
    assert fecha_de_texto("Factura del 15/03/2026 por S/ 100.00") == "2026-03-15"


def test_fecha_de_texto_tolera_separadores_mal_leidos_por_ocr():
    # El OCR real confundio "/" con "," y "'" en una prueba con una imagen real.
    assert fecha_de_texto("Fecha 15,03'2026") == "2026-03-15"


def test_fecha_de_texto_formato_en_palabras():
    assert fecha_de_texto("Lima, 15 de marzo de 2026") == "2026-03-15"


def test_fecha_de_texto_anio_de_dos_digitos():
    assert fecha_de_texto("15/03/26") == "2026-03-15"


def test_fecha_de_texto_sin_fecha_devuelve_none():
    assert fecha_de_texto("Comprobante de pago RUC 20123456789 total S/ 45.00") is None


def test_fecha_de_texto_fecha_imposible_no_hace_crashear():
    assert fecha_de_texto("32/13/2026") is None


# --- detectar_fecha (punta a punta con un QR real, sin necesitar OCR) --


def test_detectar_fecha_via_qr_no_necesita_ocr():
    qr_contenido = "20123456789|03|B001|456|9.00|59.00|2026-07-20|1|12345678|"
    imagen = _png_de_qr(qr_contenido)
    assert detectar_fecha(imagen) == "2026-07-20"


def test_detectar_fecha_imagen_invalida_no_crashea():
    assert detectar_fecha(b"no-es-una-imagen-real") is None
