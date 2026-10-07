import io

import qrcode
from PIL import Image, ImageDraw, ImageFont

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


def test_fecha_de_texto_tolera_mes_mal_leido_por_ocr():
    # "sptlembre" es justo lo que EasyOCR leyo de una imagen real de prueba
    # con "septiembre" en una foto girada 90 grados.
    assert fecha_de_texto("Trujillo, 30 de sptlembre de 2026") == "2026-09-30"


def test_fecha_de_texto_mes_irreconocible_no_inventa_nada():
    assert fecha_de_texto("30 de xyzxyz de 2026") is None


def test_fecha_de_texto_mes_escrito_en_numero():
    # Caso real: un recibo de caja a mano con "Trujillo, 25 de 09 de 2026."
    # (la plantilla dice "de ___ de ___" y la persona puso el mes en numero).
    assert fecha_de_texto("Trujillo, 25 de 09 de 2026.") == "2026-09-25"


def test_fecha_de_texto_mes_numerico_invalido_no_inventa_nada():
    assert fecha_de_texto("25 de 13 de 2026") is None


def test_fecha_de_texto_dos_fechas_numericas_distintas_es_ambiguo():
    # Un documento con dos fechas distintas completas (ej. "Emitido" y
    # "Vence") -- no hay forma segura de saber cual es la que corresponde,
    # mejor no adivinar y dejar que la persona confirme.
    texto = "Emitido: 15/03/2026  Vence: 20/04/2026"
    assert fecha_de_texto(texto) is None


def test_fecha_de_texto_misma_fecha_repetida_no_es_ambigua():
    texto = "Fecha 15/03/2026 - confirmado 15/03/2026"
    assert fecha_de_texto(texto) == "2026-03-15"


def test_fecha_de_texto_anio_con_espacio_de_formulario_preimpreso():
    # Caso real: el formulario trae "20__" preimpreso y la persona completa
    # a mano el resto, dejando un hueco que el OCR respeta ("202 6", no
    # necesariamente separado en la mitad).
    assert fecha_de_texto("Trujillo, 25 de septiembre de 202 6.") == "2026-09-25"


def test_fecha_de_texto_constancia_bcp_mes_abreviado_bajo_numero_de_operacion():
    # Constancia BCP: la fecha va debajo del numero de operacion, con el mes
    # abreviado y sin "de".
    texto = "Constancia de transferencia\nS/ 150.00\nN° de operación 01234567\n02 oct 2026 - 10:35 a.m."
    assert fecha_de_texto(texto) == "2026-10-02"


def test_fecha_de_texto_mes_abreviado_con_punto_y_mayuscula():
    assert fecha_de_texto("Operación 98765432\n15 Set. 2026, 08:12 p.m.") == "2026-09-15"


def test_fecha_de_texto_mes_completo_sin_de():
    assert fecha_de_texto("Operación 98765432\n2 octubre 2026") == "2026-10-02"


def test_fecha_de_texto_abreviatura_con_de():
    assert fecha_de_texto("02 de oct de 2026") == "2026-10-02"


def test_fecha_de_texto_pago_de_servicio_bcp_real():
    # Texto de una constancia real "Pago de servicio exitoso" (app BCP).
    texto = (
        "¡Pago de servicio exitoso!\nMonto pagado\nS/ 157.40\n"
        "Martes, 29 setiembre 2026 - 8:19 p. m.\nPagado a HIDRANDINA SA\n"
        "Código de usuario 60378861\nN° recibo: PER.202609 S/ 157.40\n"
        "Desde Ahorro Soles **** 3039\nN° de operación 06108838"
    )
    assert fecha_de_texto(texto) == "2026-09-29"


def test_fecha_de_texto_yape_real():
    # Texto de una constancia real de Yape.
    texto = (
        "¡Yapeaste!\nS/ 179.90\nSarvia Nar*\n29 set. 2026 | 8:31 p.m.\n"
        "CÓDIGO DE SEGURIDAD 5 3 6\nNro. de celular *** *** 747\n"
        "Destino Yape\nNro. de operación 20995536"
    )
    assert fecha_de_texto(texto) == "2026-09-29"


def test_fecha_de_texto_ignora_fechas_de_billetes():
    # Caso real: recibo de caja a mano fotografiado sobre billetes. El OCR no
    # logra leer la fecha manuscrita, pero si las fechas impresas de los
    # billetes -- no deben proponerse como fecha del comprobante.
    texto = (
        "Recibo DE CAJA EGReSO\nTrujillo do de 202 2\n"
        "19 DE FEBRERO DE 2015\n28 DE OCTUBRE DE 2004\n15 DE DICIEMBRE DE 2022"
    )
    assert fecha_de_texto(texto) is None


def test_fecha_de_texto_fecha_del_recibo_gana_a_la_del_billete():
    texto = "Trujillo, 2 de octubre de 2026\n15 DE DICIEMBRE DE 2022"
    assert fecha_de_texto(texto) == "2026-10-02"


def test_fecha_de_texto_acepta_comprobante_del_anio_anterior():
    assert fecha_de_texto("Fecha 28/12/2025") == "2025-12-28"


def test_fecha_de_texto_palabra_comun_no_se_confunde_con_mes_abreviado():
    # "con" esta a 1-2 letras de "oct"/"jun": no debe tomarse como mes.
    assert fecha_de_texto("Pago 12 con 2026 puntos") is None


# --- detectar_fecha (punta a punta con un QR real, sin necesitar OCR) --


def test_detectar_fecha_via_qr_no_necesita_ocr():
    qr_contenido = "20123456789|03|B001|456|9.00|59.00|2026-07-20|1|12345678|"
    imagen = _png_de_qr(qr_contenido)
    assert detectar_fecha(imagen) == "2026-07-20"


def test_detectar_fecha_imagen_invalida_no_crashea():
    assert detectar_fecha(b"no-es-una-imagen-real") is None


# --- detectar_fecha con foto de papel girada (usa el OCR real; mas lenta) --


def _fuente_legible():
    # La fuente por defecto de PIL es un bitmap minusculo (ilegible para
    # cualquier OCR); usamos una fuente real para que la prueba se parezca a
    # una foto de verdad, no a una tipografia de juguete.
    try:
        return ImageFont.truetype("arial.ttf", 28)
    except OSError:
        return ImageFont.load_default()


def _png_de_texto(texto: str, grados: int = 0) -> bytes:
    img = Image.new("RGB", (600, 120), color="white")
    ImageDraw.Draw(img).text((10, 40), texto, fill="black", font=_fuente_legible())
    if grados:
        img = img.rotate(grados, expand=True, fillcolor="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_detectar_fecha_ocr_con_foto_de_costado():
    # Simula justo el caso reportado: un recibo de papel (sin QR) fotografiado
    # girado 90 grados en vez de derecho.
    imagen = _png_de_texto("Trujillo, 30 de septiembre de 2026", grados=90)
    assert detectar_fecha(imagen) == "2026-09-30"


def test_detectar_fecha_ocr_con_foto_al_reves():
    imagen = _png_de_texto("Fecha 15/03/2026", grados=180)
    assert detectar_fecha(imagen) == "2026-03-15"
