# Entrenar el detector YOLO de comprobantes

YOLO **no lee texto**: aprende a ubicar *dónde* está cada cosa en la foto.
El bot lo usa para recortar el comprobante (dejando afuera billetes, mesa,
etc.) y la zona de la fecha, y recién ahí le pasa ese recorte al OCR.

Mientras no exista `modelos/comprobantes.pt`, el bot funciona igual que
antes (OCR sobre la foto completa).

## 1. Elegir las fotos

- Con **200–300 fotos bien marcadas** ya se puede entrenar una primera
  versión; con 500+ mejora. No hace falta marcar las mil.
- Que haya de todo: Yape, BCP, facturas, boletas, recibos a mano, fotos
  giradas, sobre billetes, con poca luz.

## 2. Marcar las fotos (etiquetar)

En cada foto se dibuja un rectángulo por cada cosa, con uno de estos
nombres **exactos**:

| Clase | Qué encerrar |
|---|---|
| `comprobante` | El papel o la captura completa del comprobante (sin billetes ni fondo) |
| `fecha` | Solo la fecha (ej. `29 set. 2026`, `Trujillo 2 de 10 de 2026`) |
| `monto` | Solo el monto total (ej. `S/ 179.90`) |

Si una foto no tiene alguno de los tres (ej. sin monto visible), se marca
lo que haya.

Herramienta recomendada: **Label Studio** (corre en tu PC, las fotos no
salen a internet):

```
uv tool install label-studio --python 3.12
label-studio
```

(No usar `pip install label-studio` con Python 3.14: pide una versión de
numpy que no existe para 3.14 e intenta compilarla, y falla con
`metadata-generation-failed`. `uv` le arma un Python 3.12 aparte, sin tocar
el del bot.)

Crear un proyecto → plantilla *Object Detection with Bounding Boxes* →
poner las 3 etiquetas de arriba → importar las fotos → marcar → **Export →
YOLO**.

(Alternativa: Roboflow, en la web. Es más cómodo, pero las fotos se suben a
sus servidores — ojo con datos personales de los comprobantes.)

## 3. Preparar y entrenar

Desde la carpeta del bot, con el `.venv` activado:

```
python entrenamiento/preparar_dataset.py C:\ruta\a\la\exportacion
python entrenamiento/entrenar.py
```

`entrenar.py` deja el modelo en `modelos/comprobantes.pt`. En CPU tarda
del orden de horas con unas cientos de fotos. Al terminar, reiniciar el
bot.

Las fotos, el dataset y los modelos **no se suben al repo** (`.gitignore`):
tienen datos personales y pesan mucho.

## 4. Revisar qué tan bien quedó

En `entrenamiento/runs/comprobantes/` quedan gráficos y ejemplos. El número
a mirar es **mAP50** de la clase `fecha` (en `results.csv`): sobre 0.8 es
bueno. Si es bajo, marcar más fotos parecidas a las que falla y volver a
entrenar.
