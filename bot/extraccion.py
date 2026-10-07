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

from . import deteccion

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
# Abreviaturas que usan las constancias de apps bancarias (BCP, Yape...):
# "02 oct 2026 - 10:35 a.m." debajo del numero de operacion. Se exigen
# exactas (sin tolerancia de OCR): en palabras de 3-4 letras, 1-2 letras de
# diferencia ya convierten cualquier palabra comun ("con", "del") en un mes.
_MESES_ABREV = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7,
    "ago": 8, "set": 9, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12,
}

# Separador tolerante: el OCR a veces confunde "/" con "," "'" "." etc.
_SEP = r"\s*[/\-.,'´ʼ]\s*"
# Año de 4 digitos, tolerando un espacio suelto entre cualquier par: muchos
# formularios impresos ya traen "20__" y la persona completa a mano el
# resto, dejando un hueco donde el OCR a veces mete un espacio -- y no
# siempre justo en la mitad ("202 6", no solo "20 26").
_ANIO = r"\d\s?\d\s?\d\s?\d"
_PATRON_NUMERICO = re.compile(r"\b(\d{1,2})" + _SEP + r"(\d{1,2})" + _SEP + r"(" + _ANIO + r"|\d{2})\b")
# El "mes" de este patron admite tanto palabra ("de Septiembre de") como
# numero ("de 09 de") -- en formularios a mano es comun que alguien escriba
# el mes en numero dentro de la misma plantilla "___ de ___ de ___".
# El nombre del mes se busca de forma tolerante (ver _mes_mas_parecido)
# porque el OCR suele leer mal una letra suelta en palabras largas
# ("septiembre" -> "sptlembre"); exigir coincidencia exacta descartaba
# fechas que en realidad se leyeron casi perfecto.
_PATRON_TEXTO = re.compile(r"\b(\d{1,2})\s+de\s+([a-zA-Zá-úÁ-Ú0-9]+)\s+de\s+(" + _ANIO + r")\b", re.IGNORECASE)
# Formato corto de constancias bancarias (BCP, Yape): "02 oct 2026",
# "02 Oct. 2026", "2 octubre, 2026" -- sin "de" y con el mes solo en letras
# (un mes numerico sin "de" seria cualquier trio de numeros sueltos).
_PATRON_CORTO = re.compile(r"\b(\d{1,2})\s+([a-zA-Zá-úÁ-Ú]{3,10})\.?,?\s+(" + _ANIO + r")\b", re.IGNORECASE)


def _distancia_edicion(a: str, b: str) -> int:
    """Distancia de Levenshtein simple (sin dependencias externas)."""
    if a == b:
        return 0
    fila = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        nueva = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            costo = 0 if ca == cb else 1
            nueva[j] = min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + costo)
        fila = nueva
    return fila[-1]


def _mes_mas_parecido(palabra: str) -> Optional[int]:
    """Encuentra el mes cuyo nombre se parece mas a lo que leyo el OCR,
    tolerando 1-2 letras mal leidas (un error tipico de OCR en fuentes
    chicas o fotos con angulo, no un problema del algoritmo de fechas)."""
    palabra = palabra.lower()
    if palabra in _MESES:
        return _MESES[palabra]
    mejor_mes, mejor_distancia = None, 3  # maximo tolerado
    for nombre, numero in _MESES.items():
        d = _distancia_edicion(palabra, nombre)
        if d < mejor_distancia:
            mejor_mes, mejor_distancia = numero, d
    return mejor_mes


def _candidatos_numericos(texto: str) -> list[str]:
    candidatos = []
    for m in _PATRON_NUMERICO.finditer(texto):
        dia, mes, anio = m.groups()
        anio = anio.replace(" ", "")
        if len(anio) == 2:
            anio = "20" + anio
        try:
            candidatos.append(datetime(int(anio), int(mes), int(dia)).strftime("%Y-%m-%d"))
        except ValueError:
            continue
    return candidatos


def _candidatos_texto(texto: str) -> list[str]:
    candidatos = []
    for m in _PATRON_TEXTO.finditer(texto):
        dia, mes_texto, anio = m.groups()
        anio = anio.replace(" ", "")
        if mes_texto.isdigit():
            mes = int(mes_texto)
            if not (1 <= mes <= 12):
                continue
        else:
            mes = _MESES_ABREV.get(mes_texto.lower()) or _mes_mas_parecido(mes_texto)
            if mes is None:
                continue
        try:
            candidatos.append(datetime(int(anio), mes, int(dia)).strftime("%Y-%m-%d"))
        except ValueError:
            continue
    return candidatos


def _candidatos_corto(texto: str) -> list[str]:
    candidatos = []
    for m in _PATRON_CORTO.finditer(texto):
        dia, mes_texto, anio = m.groups()
        mes_texto = mes_texto.lower()
        mes = _MESES_ABREV.get(mes_texto)
        if mes is None and len(mes_texto) >= 5:
            mes = _mes_mas_parecido(mes_texto)
        if mes is None:
            continue
        try:
            candidatos.append(datetime(int(anio.replace(" ", "")), mes, int(dia)).strftime("%Y-%m-%d"))
        except ValueError:
            continue
    return candidatos


def _anio_actual() -> int:
    return datetime.now().year


def fecha_de_texto(texto: str) -> Optional[str]:
    """Busca una fecha en espanol dentro de un texto libre (salida de OCR).
    Devuelve YYYY-MM-DD, o None si no encuentra ninguna fecha, o si encuentra
    mas de una fecha DISTINTA (ej. un recibo con una fecha tachada y
    corregida al lado, donde el OCR lee ambas) -- en ese caso es mas seguro
    dejar que la persona confirme a mano que adivinar cual es la correcta."""
    # Un comprobante que se sube hoy es de este año o, como mucho, del
    # anterior. Fechas mas viejas casi siempre son otra cosa impresa en la
    # foto -- caso real: recibos fotografiados sobre billetes, que traen su
    # fecha de emision ("15 de diciembre de 2022"). Mejor descartarlas que
    # proponerlas como fecha del comprobante.
    anio_actual = _anio_actual()
    candidatos = []
    for extraer in (_candidatos_numericos, _candidatos_texto, _candidatos_corto):
        candidatos = [c for c in extraer(texto) if anio_actual - 1 <= int(c[:4]) <= anio_actual]
        if candidatos:
            break
    unicos = set(candidatos)
    if len(unicos) == 1:
        return unicos.pop()
    return None


def _obtener_lector_ocr():
    global _lector_ocr
    if _lector_ocr is None:
        import easyocr

        _lector_ocr = easyocr.Reader(["es"], gpu=False, verbose=False)
    return _lector_ocr


# Comprobantes de papel (no electronicos) suelen llegar fotografiados de
# costado, al reves, o con algo de angulo -- a diferencia del QR (que se
# detecta en cualquier rotacion por diseño), el OCR de texto si es sensible
# a la orientacion. Probamos las 4 rotaciones derechas y nos quedamos con la
# primera que produzca una fecha reconocible.
_ROTACIONES = (0, 90, 180, 270)


def _rotar(img, grados: int):
    if grados == 0:
        return img
    if grados == 90:
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    if grados == 180:
        return cv2.rotate(img, cv2.ROTATE_180)
    if grados == 270:
        return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    raise ValueError(f"rotacion no soportada: {grados}")


def _reconstruir_lineas(detecciones) -> str:
    """
    EasyOCR devuelve cada region de texto por separado, SIN garantizar orden
    de lectura. En una foto con mucho contenido (ej. un recibo sobre billetes
    con sus propios numeros de serie), eso significa que palabras de una
    misma linea -- "25", "de", "Septiembre", "de", "2026" -- pueden terminar
    lejos unas de otras en el texto final, separadas por texto de otra parte
    de la imagen. La fecha deja de reconocerse aunque cada palabra se haya
    leido bien, porque nunca aparecen juntas en el texto.

    Agrupa los cuadros de texto por cercania vertical (su centro Y) y ordena
    cada grupo de izquierda a derecha, para que el texto final se parezca a
    como se lee la foto de verdad.
    """
    cajas = []
    for bbox, texto, _confianza in detecciones:
        ys = [p[1] for p in bbox]
        xs = [p[0] for p in bbox]
        cajas.append((sum(ys) / len(ys), min(xs), max(ys) - min(ys), texto))

    if not cajas:
        return ""

    cajas.sort(key=lambda c: c[0])  # de arriba a abajo
    alto_promedio = sum(c[2] for c in cajas) / len(cajas)
    umbral = max(alto_promedio * 0.6, 5)

    # Comparamos contra el PROMEDIO de la linea actual, no contra la ultima
    # caja agregada -- comparar solo contra la ultima deja que una cadena de
    # cajas cercanas entre si (cada una a poco menos del umbral de la
    # siguiente) vaya arrastrando la linea de a poquitos por toda la foto,
    # aunque el principio y el final terminen lejísimos.
    lineas = [[cajas[0]]]
    suma_y_linea = cajas[0][0]
    for caja in cajas[1:]:
        promedio_y_linea = suma_y_linea / len(lineas[-1])
        if abs(caja[0] - promedio_y_linea) <= umbral:
            lineas[-1].append(caja)
            suma_y_linea += caja[0]
        else:
            lineas.append([caja])
            suma_y_linea = caja[0]

    texto_lineas = []
    for linea in lineas:
        linea.sort(key=lambda c: c[1])  # de izquierda a derecha
        texto_lineas.append(" ".join(c[3] for c in linea))
    return "\n".join(texto_lineas)


def _leer_texto_ocr(img) -> str:
    detecciones = _obtener_lector_ocr().readtext(img, detail=1)
    return _reconstruir_lineas(detecciones)


def detectar_fecha(imagen_bytes: bytes) -> Optional[str]:
    """
    Punto de entrada: intenta QR primero (cualquier rotacion), despues OCR
    probando las 4 rotaciones derechas. Devuelve la fecha en YYYY-MM-DD, o
    None si no se pudo detectar por ningun medio.

    Es una funcion sincrona (bloqueante, sobre todo el OCR) -- quien la llama
    desde un handler async debe correrla en un executor para no trabar el
    event loop del bot mientras dura.
    """
    qr = _leer_qr(imagen_bytes)
    if qr:
        fecha = fecha_de_qr_sunat(qr)
        if fecha:
            return fecha

    img = _decodificar_imagen(imagen_bytes)
    if img is None:
        return None

    # Con un modelo YOLO entrenado, primero se lee solo la zona de la fecha
    # y despues solo el comprobante (sin billetes ni fondo). Sin modelo,
    # detectar_regiones devuelve {} y se va directo a la foto completa.
    regiones = deteccion.detectar_regiones(img)
    for recorte in regiones.get("fecha", []):
        fecha = _fecha_por_rotaciones(_agrandar(recorte))
        if fecha:
            return fecha
    for recorte in regiones.get("comprobante", []):
        fecha = _fecha_por_rotaciones(recorte)
        if fecha:
            return fecha
    return _fecha_por_rotaciones(img)


# Un recorte chico (solo la linea de la fecha) se lee mejor agrandado: en
# pruebas con un recibo manuscrito, agrandar 3x hizo que el OCR leyera bien
# el dia que en la foto completa confundia con letras.
_ALTO_MINIMO_RECORTE = 150


def _agrandar(img):
    alto = img.shape[0]
    if alto >= _ALTO_MINIMO_RECORTE:
        return img
    escala = _ALTO_MINIMO_RECORTE / max(alto, 1)
    return cv2.resize(img, None, fx=escala, fy=escala, interpolation=cv2.INTER_CUBIC)


def _fecha_por_rotaciones(img) -> Optional[str]:
    for grados in _ROTACIONES:
        try:
            texto = _leer_texto_ocr(_rotar(img, grados))
        except Exception:
            continue
        fecha = fecha_de_texto(texto)
        if fecha:
            return fecha
    return None
