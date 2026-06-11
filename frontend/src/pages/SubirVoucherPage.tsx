import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";
import {
  CATEGORIAS_VOUCHER,
  CATEGORIAS_DOCUMENTO,
  COLOR_CATEGORIA,
  LABEL_CATEGORIA,
  type Categoria,
} from "../lib/categorias";

interface TarjetaProps {
  titulo: string;
  categorias: readonly Categoria[];
  sustantivo: string; // "voucher" | "documento"
}

function TarjetaSubida({ titulo, categorias, sustantivo }: TarjetaProps) {
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ voucherId: string }[] | null>(null);

  const onDrop = useCallback((aceptados: File[]) => {
    setArchivos((prev) => [...prev, ...aceptados].slice(0, 5));
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/heic": [".heic"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
  });

  const quitar = (i: number) => setArchivos((prev) => prev.filter((_, idx) => idx !== i));

  const subir = async () => {
    if (!categoria) return setError("Selecciona una categoría");
    if (archivos.length === 0) return setError("Agrega al menos una imagen");
    setError("");
    setCargando(true);
    try {
      const fd = new FormData();
      fd.append("categoria", categoria);
      archivos.forEach((a) => fd.append("imagenes", a));
      const { data } = await api.post("/vouchers/upload", fd);
      setResultado(data.vouchers);
      setArchivos([]);
      setCategoria("");
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primario">{titulo}</h2>

      {resultado && (
        <div className="card bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">¡Carga exitosa!</h3>
          <div className="flex flex-wrap gap-2">
            {resultado.map((r) => (
              <span key={r.voucherId} className="font-mono bg-white border border-green-300 px-3 py-1 rounded">
                {r.voucherId}
              </span>
            ))}
          </div>
          <button className="btn-ghost mt-3" onClick={() => setResultado(null)}>Subir más</button>
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="card space-y-5">
        <div>
          <label className="label">Categoría</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`rounded-lg border-2 py-3 text-sm font-medium transition ${
                  categoria === c ? "text-white" : "bg-white text-slate-600"
                }`}
                style={
                  categoria === c
                    ? { background: COLOR_CATEGORIA[c], borderColor: COLOR_CATEGORIA[c] }
                    : { borderColor: COLOR_CATEGORIA[c] }
                }
              >
                {LABEL_CATEGORIA[c]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Imágenes (hasta 5)</label>
          <div
            {...getRootProps()}
            className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${
              isDragActive ? "border-acento bg-blue-50" : "border-slate-300"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-slate-500">
              {isDragActive ? "Suelta aquí..." : "Arrastra imágenes o haz clic para seleccionar"}
            </p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP, HEIC · máx 10 MB c/u</p>
          </div>

          {/* Captura desde camara (movil) */}
          <label className="btn-ghost mt-3 cursor-pointer">
            Tomar foto con la cámara
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))}
            />
          </label>
        </div>

        {archivos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {archivos.map((a, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(a)} alt="preview" className="w-full h-24 object-cover rounded" />
                <button
                  onClick={() => quitar(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary w-full" onClick={subir} disabled={cargando}>
          {cargando ? "Subiendo..." : `Subir ${archivos.length || ""} ${sustantivo}(s)`}
        </button>
      </div>
    </div>
  );
}

export default function SubirVoucherPage() {
  const usuario = useAuth((s) => s.usuario);
  const permitidas = new Set(usuario?.categorias ?? []);
  const vouchers = CATEGORIAS_VOUCHER.filter((c) => permitidas.has(c)) as Categoria[];
  const documentos = CATEGORIAS_DOCUMENTO.filter((c) => permitidas.has(c)) as Categoria[];

  return (
    <div className="space-y-8 max-w-2xl">
      {vouchers.length > 0 && (
        <TarjetaSubida titulo="Subir Voucher" categorias={vouchers} sustantivo="voucher" />
      )}
      {documentos.length > 0 && (
        <TarjetaSubida titulo="Subir Documento" categorias={documentos} sustantivo="documento" />
      )}
      {vouchers.length === 0 && documentos.length === 0 && (
        <div className="card text-slate-500">No tienes categorías habilitadas para subir. Contacta al administrador.</div>
      )}
    </div>
  );
}
