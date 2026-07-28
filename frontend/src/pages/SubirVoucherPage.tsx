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

// Categorias de documento que ademas admiten carga directa de PDF (sin foto).
const CATEGORIAS_PDF = ["FACTURA", "BOLETA"] as const;

interface TarjetaProps {
  titulo: string;
  categorias: readonly Categoria[];
  sustantivo: string; // "voucher" | "documento"
}

// Cada foto lleva su propia fecha real y nota.
interface ItemSubida {
  file: File;
  fecha: string; // YYYY-MM-DD (fecha real del voucher)
  descripcion: string; // nota libre
}

function fechaHoy(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function TarjetaSubida({ titulo, categorias, sustantivo }: TarjetaProps) {
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [items, setItems] = useState<ItemSubida[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ voucherId: string }[] | null>(null);

  const onDrop = useCallback((aceptados: File[]) => {
    setItems((prev) =>
      [...prev, ...aceptados.map((file) => ({ file, fecha: fechaHoy(), descripcion: "" }))].slice(0, 5)
    );
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

  const quitar = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const actualizar = (i: number, campo: "fecha" | "descripcion", valor: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));

  const subir = async () => {
    if (!categoria) return setError("Selecciona una categoría");
    if (items.length === 0) return setError("Agrega al menos una imagen");
    setError("");
    setCargando(true);
    try {
      const fd = new FormData();
      fd.append("categoria", categoria);
      items.forEach((it) => fd.append("imagenes", it.file));
      fd.append("metadatos", JSON.stringify(items.map((it) => ({ fecha: it.fecha, descripcion: it.descripcion }))));
      const { data } = await api.post("/vouchers/upload", fd);
      setResultado(data.vouchers);
      setItems([]);
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

        {items.length > 0 && (
          <div className="space-y-3">
            <label className="label">Datos de cada foto</label>
            {items.map((it, i) => (
              <div key={i} className="flex gap-3 items-start border border-slate-200 rounded-lg p-2">
                <img
                  src={URL.createObjectURL(it.file)}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded shrink-0"
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Fecha del voucher</label>
                    <input
                      type="date"
                      className="input"
                      value={it.fecha}
                      onChange={(e) => actualizar(i, "fecha", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Nota / descripción</label>
                    <input
                      className="input"
                      placeholder="Ej: pago del 10/06, factura de luz…"
                      value={it.descripcion}
                      onChange={(e) => actualizar(i, "descripcion", e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={() => quitar(i)}
                  className="bg-red-500 text-white rounded-full w-6 h-6 text-xs shrink-0"
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary w-full" onClick={subir} disabled={cargando}>
          {cargando ? "Subiendo..." : `Subir ${items.length || ""} ${sustantivo}(s)`}
        </button>
      </div>
    </div>
  );
}

interface TarjetaDocumentoPdfProps {
  categoria: (typeof CATEGORIAS_PDF)[number];
}

function TarjetaDocumentoPdf({ categoria }: TarjetaDocumentoPdfProps) {
  const [items, setItems] = useState<ItemSubida[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ voucherId: string }[] | null>(null);

  const etiqueta = LABEL_CATEGORIA[categoria]; // "Factura" | "Boleta"
  const etiquetaMin = etiqueta.toLowerCase();
  const color = COLOR_CATEGORIA[categoria];

  const onDrop = useCallback((aceptados: File[]) => {
    setItems((prev) =>
      [
        ...prev,
        ...aceptados.map((file) => ({
          file,
          fecha: fechaHoy(),
          descripcion: file.name.replace(/\.pdf$/i, ""),
        })),
      ].slice(0, 5)
    );
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
  });

  const quitar = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const actualizar = (i: number, campo: "fecha" | "descripcion", valor: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));

  const subir = async () => {
    if (items.length === 0) return setError(`Agrega al menos un PDF de ${etiquetaMin}`);
    setError("");
    setCargando(true);
    try {
      const fd = new FormData();
      fd.append("categoria", categoria);
      items.forEach((it) => fd.append("imagenes", it.file));
      fd.append("metadatos", JSON.stringify(items.map((it) => ({ fecha: it.fecha, descripcion: it.descripcion }))));
      const { data } = await api.post("/vouchers/upload", fd);
      setResultado(data.vouchers);
      setItems([]);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-primario">{etiqueta}s electronicas (PDF)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sube aqui archivos PDF de {etiquetaMin}s electronicas sin tomar capturas.
        </p>
      </div>

      {resultado && (
        <div className="card bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">PDF cargado correctamente</h3>
          <div className="flex flex-wrap gap-2">
            {resultado.map((r) => (
              <span key={r.voucherId} className="font-mono bg-white border border-green-300 px-3 py-1 rounded">
                {r.voucherId}
              </span>
            ))}
          </div>
          <button className="btn-ghost mt-3" onClick={() => setResultado(null)}>Subir mas PDF</button>
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="label">Categoria</label>
            <span
              className="inline-flex items-center rounded-lg border-2 px-4 py-2 text-sm font-medium text-white"
              style={{ background: color, borderColor: color }}
            >
              {etiqueta}
            </span>
          </div>
          <span className="text-xs text-slate-400">PDF - max 10 MB c/u - hasta 5 archivos</span>
        </div>

        <div>
          <label className="label">Archivos PDF</label>
          <div
            {...getRootProps()}
            className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${
              isDragActive ? "border-red-400 bg-red-50" : "border-slate-300"
            }`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded bg-red-50 text-red-600 font-bold">
              PDF
            </div>
            <p className="text-slate-500">
              {isDragActive ? "Suelta los PDF aqui..." : `Arrastra ${etiquetaMin}s PDF o haz clic para seleccionar`}
            </p>
            <p className="text-xs text-slate-400 mt-1">Solo PDF de {etiquetaMin}s electronicas</p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            <label className="label">Datos de cada {etiquetaMin}</label>
            {items.map((it, i) => (
              <div key={`${it.file.name}-${i}`} className="grid gap-3 border border-slate-200 rounded-lg p-3 sm:grid-cols-[1fr_160px_32px]">
                <div>
                  <div className="text-sm font-medium text-slate-700 truncate">{it.file.name}</div>
                  <label className="label text-xs mt-2">Proveedor / RUC / nota</label>
                  <input
                    className="input"
                    placeholder="Ej: proveedor, RUC, serie o numero"
                    value={it.descripcion}
                    onChange={(e) => actualizar(i, "descripcion", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-xs">Fecha de {etiquetaMin}</label>
                  <input
                    type="date"
                    className="input"
                    value={it.fecha}
                    onChange={(e) => actualizar(i, "fecha", e.target.value)}
                  />
                </div>
                <button
                  onClick={() => quitar(i)}
                  className="self-start bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                  title="Quitar"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary w-full" onClick={subir} disabled={cargando}>
          {cargando ? "Subiendo PDF..." : `Subir ${items.length || ""} PDF`}
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
  const categoriasPdf = CATEGORIAS_PDF.filter((c) => permitidas.has(c));

  return (
    <div className="space-y-8 max-w-3xl">
      {vouchers.length > 0 && (
        <TarjetaSubida titulo="Subir Voucher" categorias={vouchers} sustantivo="voucher" />
      )}
      {documentos.length > 0 && (
        <TarjetaSubida titulo="Subir Documento" categorias={documentos} sustantivo="documento" />
      )}
      {categoriasPdf.map((c) => (
        <TarjetaDocumentoPdf key={c} categoria={c} />
      ))}
      {vouchers.length === 0 && documentos.length === 0 && (
        <div className="card text-slate-500">No tienes categorías habilitadas para subir. Contacta al administrador.</div>
      )}
    </div>
  );
}
