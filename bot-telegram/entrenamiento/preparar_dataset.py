"""
Arma entrenamiento/dataset/ a partir de una exportacion en formato YOLO
(Label Studio, Roboflow, X-AnyLabeling...): una carpeta con las fotos, otra
con un .txt de etiquetas por foto, y classes.txt con los nombres de clase.

Reordena las clases al orden del bot (cada herramienta numera a su manera),
separa 80% entrenamiento / 20% validacion y escribe dataset/data.yaml.

Uso:
    python entrenamiento/preparar_dataset.py RUTA_DE_LA_EXPORTACION
"""
import random
import shutil
import sys
from pathlib import Path

CLASES = ("comprobante", "fecha", "monto")  # mismo orden que bot/deteccion.py
# Otros nombres con que se pudo etiquetar la misma clase.
ALIAS = {"cantidad": "monto", "importe": "monto", "total": "monto"}
EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp"}
PROPORCION_VALIDACION = 0.2
DESTINO = Path(__file__).resolve().parent / "dataset"


def _buscar(raiz: Path, nombre: str) -> Path:
    candidatos = [p for p in raiz.rglob(nombre)]
    if not candidatos:
        sys.exit(f"No encontre '{nombre}' dentro de {raiz}")
    return candidatos[0]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    origen = Path(sys.argv[1]).resolve()

    nombres_origen = [
        ALIAS.get(n.lower(), n.lower())
        for n in _buscar(origen, "classes.txt").read_text(encoding="utf-8").split()
    ]
    desconocidas = set(nombres_origen) - set(CLASES)
    if desconocidas:
        sys.exit(f"Clases desconocidas: {sorted(desconocidas)} (usar solo {CLASES})")
    reasignar = {i: CLASES.index(n) for i, n in enumerate(nombres_origen)}

    etiquetas = {p.stem: p for p in origen.rglob("*.txt") if p.name != "classes.txt"}
    pares = [
        (foto, etiquetas[foto.stem])
        for foto in origen.rglob("*")
        if foto.suffix.lower() in EXTENSIONES and foto.stem in etiquetas
    ]
    if not pares:
        sys.exit("No hay fotos con su .txt de etiquetas al lado (mismo nombre).")

    random.seed(42)  # misma separacion si se vuelve a correr
    random.shuffle(pares)
    corte = max(1, int(len(pares) * PROPORCION_VALIDACION))
    grupos = {"val": pares[:corte], "train": pares[corte:]}

    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    for grupo, lista in grupos.items():
        (DESTINO / "images" / grupo).mkdir(parents=True)
        (DESTINO / "labels" / grupo).mkdir(parents=True)
        for foto, etiqueta in lista:
            shutil.copy2(foto, DESTINO / "images" / grupo / foto.name)
            lineas = []
            for linea in etiqueta.read_text(encoding="utf-8").splitlines():
                partes = linea.split()
                if partes:
                    partes[0] = str(reasignar[int(partes[0])])
                    lineas.append(" ".join(partes))
            (DESTINO / "labels" / grupo / f"{foto.stem}.txt").write_text("\n".join(lineas), encoding="utf-8")

    # Ruta absoluta: ultralytics resuelve las relativas contra su propia
    # carpeta de datasets, no contra la ubicacion del yaml.
    nombres = "".join(f"  {i}: {n}\n" for i, n in enumerate(CLASES))
    (DESTINO / "data.yaml").write_text(
        f"path: {DESTINO.as_posix()}\ntrain: images/train\nval: images/val\nnames:\n{nombres}",
        encoding="utf-8",
    )

    print(f"Listo: {len(grupos['train'])} fotos de entrenamiento, {len(grupos['val'])} de validacion -> {DESTINO}")


if __name__ == "__main__":
    main()
