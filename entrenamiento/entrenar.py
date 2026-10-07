"""
Entrena el detector YOLO de comprobantes y deja el resultado en
modelos/comprobantes.pt, que es donde lo busca el bot.

Antes: correr preparar_dataset.py. La primera vez descarga el modelo base
(yolo11n.pt, ~6 MB) desde internet.

Uso:
    python entrenamiento/entrenar.py            # 100 epocas
    python entrenamiento/entrenar.py 50         # otra cantidad de epocas
"""
import shutil
import sys
from pathlib import Path

from ultralytics import YOLO

AQUI = Path(__file__).resolve().parent
MODELO_FINAL = AQUI.parent / "modelos" / "comprobantes.pt"


def main() -> None:
    epocas = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    data = AQUI / "dataset" / "data.yaml"
    if not data.exists():
        sys.exit("Falta el dataset: correr primero entrenamiento/preparar_dataset.py")

    # yolo11n: el modelo mas chico. Entrena en CPU en un tiempo razonable y
    # alcanza para ubicar 3 tipos de caja grandes y bien distintas.
    modelo = YOLO("yolo11n.pt")
    resultado = modelo.train(
        data=str(data),
        epochs=epocas,
        imgsz=640,
        project=str(AQUI / "runs"),
        name="comprobantes",
        exist_ok=True,
        # Las fotos llegan giradas y de costado: que el entrenamiento tambien
        # las vea asi. Sin volteo horizontal: el texto espejado no existe.
        degrees=90,
        fliplr=0.0,
    )

    mejor = Path(resultado.save_dir) / "weights" / "best.pt"
    MODELO_FINAL.parent.mkdir(exist_ok=True)
    shutil.copy2(mejor, MODELO_FINAL)
    print(f"Modelo listo en {MODELO_FINAL}. Reiniciar el bot para que lo use.")


if __name__ == "__main__":
    main()
