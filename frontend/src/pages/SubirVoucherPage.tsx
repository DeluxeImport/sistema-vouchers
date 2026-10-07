import { useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";
import {
  TIPOS_DOCUMENTO,
  bloquesPorSubgrupo,
  colorTipo,
  etiquetaCategoria,
  etiquetaCompleta,
  gruposPermitidos,
  type CategoriaContable,
  type TipoDocumento,
} from "../lib/categorias";

export type ModoSubida = "voucher" | "documento";

type GrupoPermitido = ReturnType<typeof gruposPermitidos>[number];

// Cada archivo lleva su propia fecha real y nota.
interface ItemSubida {
  file: File;
  fecha: string; // YYYY-MM-DD (fecha real del comprobante)
  descripcion: string; // nota libre
}

function fechaHoy(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function esPdf(f: File): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}

// Seleccion en dos pasos: primero la categoria principal y luego su
// subcategoria (las de "Servicios Básicos" se agrupan bajo su titulo).
// Un grupo con una sola subcategoria (ej. Recompras) se elige de una vez.
function SelectorCategoria({
  grupos,
  valor,
  onChange,
}: {
  grupos: GrupoPermitido[];
  valor: CategoriaContable | "";
  onChange: (c: CategoriaContable | "") => void;
}) {
  const grupoDelValor = grupos.find((g) => valor && g.categorias.includes(valor));
  const [abierto, setAbierto] = useState<string | null>(grupoDelValor?.id ?? null);
  const grupoAbierto = grupos.find((g) => g.id === abierto);

  const elegirGrupo = (g: GrupoPermitido) => {
    setAbierto(g.id);
    if (g.categorias.length === 1) onChange(g.categorias[0]);
    else if (!valor || !g.categorias.includes(valor)) onChange("");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">1. Categoría principal</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {grupos.map((g) => {
            const activo = g.id === abierto;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => elegirGrupo(g)}
                className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition ${
                  activo ? "text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                style={activo ? { background: g.color, borderColor: g.color } : { borderColor: g.color }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {grupoAbierto && grupoAbierto.categorias.length > 1 && (
        <div>
          <label className="label">2. Subcategoría</label>
          <div className="space-y-3">
            {bloquesPorSubgrupo(grupoAbierto.categorias).map((b, i) => (
              <div key={b.titulo ?? `b${i}`} className={b.titulo ? "rounded-lg bg-slate-50 p-2" : ""}>
                {b.titulo && <div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">{b.titulo}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {b.categorias.map((c) => {
                    const activa = valor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onChange(c)}
                        className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition ${
                          activa ? "text-white font-medium" : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                        style={
                          activa
                            ? { background: grupoAbierto.color, borderColor: grupoAbierto.color }
                            : { borderColor: `${grupoAbierto.color}66` }
                        }
                      >
                        {etiquetaCategoria(c)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FormularioProps {
  modo: ModoSubida;
  grupos: GrupoPermitido[];
  tipos: TipoDocumento[]; // solo para documentos
}

function FormularioSubida({ modo, grupos, tipos }: FormularioProps) {
  const esDocumento = modo === "documento";
  const sustantivo = esDocumento ? "documento" : "voucher";
  const [tipo, setTipo] = useState<TipoDocumento | "">(tipos.length === 1 ? tipos[0] : "");
  const [categoria, setCategoria] = useState<CategoriaContable | "">("");
  const [items, setItems] = useState<ItemSubida[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ voucherId: string }[] | null>(null);
  // Cambia la key del selector para limpiarlo despues de una subida.
  const [reinicio, setReinicio] = useState(0);

  const onDrop = useCallback((aceptados: File[]) => {
    setItems((prev) =>
      [
        ...prev,
        ...aceptados.map((file) => ({
          file,
          fecha: fechaHoy(),
          // En PDFs electronicos el nombre suele traer serie/numero: sirve de nota inicial.
          descripcion: esPdf(file) ? file.name.replace(/\.pdf$/i, "") : "",
        })),
      ].slice(0, 5)
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
      ...(esDocumento ? { "application/pdf": [".pdf"] } : {}),
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
  });

  const quitar = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const actualizar = (i: number, campo: "fecha" | "descripcion", valor: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));

  const subir = async () => {
    if (esDocumento && !tipo) return setError("Selecciona el tipo de documento");
    if (!categoria) return setError("Selecciona la categoría y subcategoría");
    if (items.length === 0) return setError("Agrega al menos un archivo");
    setError("");
    setCargando(true);
    try {
      const fd = new FormData();
      fd.append("categoria", categoria);
      if (esDocumento) fd.append("tipoDocumento", tipo);
      items.forEach((it) => fd.append("imagenes", it.file));
      fd.append("metadatos", JSON.stringify(items.map((it) => ({ fecha: it.fecha, descripcion: it.descripcion }))));
      const { data } = await api.post("/vouchers/upload", fd);
      setResultado(data.vouchers);
      setItems([]);
      setCategoria("");
      setReinicio((r) => r + 1);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-primario">{esDocumento ? "Subir Documento" : "Subir Voucher"}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {esDocumento
            ? "Sustento fiscal: notas, facturas y boletas (foto o PDF electrónico)."
            : "Sustento de pago / salida de dinero."}
        </p>
      </div>

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
        {esDocumento && (
          <div>
            <label className="label">Tipo de documento</label>
            <div className="grid grid-cols-3 gap-2">
              {tipos.map((t) => {
                const activo = tipo === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-medium transition ${
                      activo ? "text-white" : "bg-white text-slate-600"
                    }`}
                    style={activo ? { background: colorTipo(t), borderColor: colorTipo(t) } : { borderColor: colorTipo(t) }}
                  >
                    {etiquetaCategoria(t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <SelectorCategoria key={reinicio} grupos={grupos} valor={categoria} onChange={setCategoria} />

        {categoria && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Seleccionado: <span className="font-medium text-slate-800">{etiquetaCompleta(categoria)}</span>
          </div>
        )}

        <div>
          <label className="label">{esDocumento ? "Archivos (hasta 5)" : "Imágenes (hasta 5)"}</label>
          <div
            {...getRootProps()}
            className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${
              isDragActive ? "border-acento bg-blue-50" : "border-slate-300"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-slate-500">
              {isDragActive ? "Suelta aquí..." : "Arrastra archivos o haz clic para seleccionar"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              JPG, PNG, WEBP, HEIC{esDocumento ? ", PDF" : ""} · máx 10 MB c/u
            </p>
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
            <label className="label">Datos de cada archivo</label>
            {items.map((it, i) => (
              <div key={`${it.file.name}-${i}`} className="flex gap-3 items-start border border-slate-200 rounded-lg p-2">
                {esPdf(it.file) ? (
                  <div className="w-20 h-20 shrink-0 rounded bg-red-50 text-red-600 font-bold flex items-center justify-center">
                    PDF
                  </div>
                ) : (
                  <img src={URL.createObjectURL(it.file)} alt="preview" className="w-20 h-20 object-cover rounded shrink-0" />
                )}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                  <div>
                    <label className="label text-xs">Fecha del {sustantivo}</label>
                    <input
                      type="date"
                      className="input"
                      value={it.fecha}
                      onChange={(e) => actualizar(i, "fecha", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{esDocumento ? "Proveedor / RUC / nota" : "Nota / descripción"}</label>
                    <input
                      className="input"
                      placeholder={esDocumento ? "Ej: proveedor, RUC, serie o número" : "Ej: pago del 10/06, recibo de luz…"}
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

// Que puede subir el usuario: categorias para vouchers y, para documentos,
// los tipos permitidos + las categorias que aplican a documentos.
export function usePermisosSubida() {
  const usuario = useAuth((s) => s.usuario);
  const permitidas = new Set(usuario?.categorias ?? []);
  const puede = (c: string) => permitidas.has(c);
  const gruposVoucher = gruposPermitidos(puede);
  const gruposDocumento = gruposPermitidos(puede, true);
  const tipos = TIPOS_DOCUMENTO.filter(puede) as TipoDocumento[];
  return {
    gruposVoucher,
    gruposDocumento,
    tipos,
    hayVoucher: gruposVoucher.length > 0,
    hayDocumento: tipos.length > 0 && gruposDocumento.length > 0,
  };
}

// Pestañas Todo / Voucher / Documento (utiles sobre todo en el movil, donde
// no se ve el submenu de la barra lateral).
function PestanasSubida({ hayVoucher, hayDocumento }: { hayVoucher: boolean; hayDocumento: boolean }) {
  if (!hayVoucher || !hayDocumento) return null;
  const clase = ({ isActive }: { isActive: boolean }) =>
    `flex-1 rounded-md px-3 py-1.5 text-center text-sm transition ${
      isActive ? "bg-white shadow text-primario font-medium" : "text-slate-500 hover:text-slate-700"
    }`;
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      <NavLink to="/subir" end className={clase}>Todo</NavLink>
      <NavLink to="/subir/voucher" className={clase}>Voucher</NavLink>
      <NavLink to="/subir/documento" className={clase}>Documento</NavLink>
    </div>
  );
}

// modo ausente = vista general (voucher y documento en la misma pagina).
export default function SubirVoucherPage({ modo }: { modo?: ModoSubida }) {
  const { gruposVoucher, gruposDocumento, tipos, hayVoucher, hayDocumento } = usePermisosSubida();
  const verVoucher = hayVoucher && modo !== "documento";
  const verDocumento = hayDocumento && modo !== "voucher";

  return (
    <div className="space-y-8 max-w-3xl">
      <PestanasSubida hayVoucher={hayVoucher} hayDocumento={hayDocumento} />
      {verVoucher && <FormularioSubida modo="voucher" grupos={gruposVoucher} tipos={[]} />}
      {verDocumento && <FormularioSubida modo="documento" grupos={gruposDocumento} tipos={tipos} />}
      {!verVoucher && !verDocumento && (
        <div className="card text-slate-500">
          No tienes categorías habilitadas para subir {modo === "documento" ? "documentos" : modo === "voucher" ? "vouchers" : ""}.
          Contacta al administrador.
        </div>
      )}
    </div>
  );
}
