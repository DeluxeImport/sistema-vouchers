import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, mensajeError } from "../api/client";
import AuthImage from "../components/AuthImage";
import { useAuth } from "../store/auth";
import {
  GRUPOS,
  SOLO_VOUCHER,
  TIPOS_DOCUMENTO,
  colorCategoria,
  colorTipo,
  esLegado,
  esTipoDocumento,
  etiquetaCategoria,
  etiquetaCompleta,
  etiquetaRegistro,
  gruposPermitidos,
  type CategoriaContable,
} from "../lib/categorias";

interface VoucherItem {
  voucherId: string;
  categoria: string;
  tipoDocumento?: string | null;
  formato?: string | null;
  nombreArchivo?: string;
  fechaCarga: string;
  fechaVoucher?: string | null;
  descripcion?: string | null;
  usuario: { id: string; nombre: string };
}

function esPdf(v: VoucherItem): boolean {
  return v.formato?.toLowerCase() === "pdf";
}

// Etiquetas de un registro: tipo (Voucher / Nota / Factura / Boleta) + categoria.
function Etiquetas({ v }: { v: VoucherItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      {esTipoDocumento(v.tipoDocumento) ? (
        <span className="text-[10px] px-2 py-0.5 rounded text-white" style={{ background: colorTipo(v.tipoDocumento) }}>
          {etiquetaCategoria(v.tipoDocumento)}
        </span>
      ) : (
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">Voucher</span>
      )}
      <span
        className="text-[10px] px-2 py-0.5 rounded text-white max-w-full truncate"
        style={{ background: colorCategoria(v.categoria) }}
        title={etiquetaRegistro(v.categoria, v.tipoDocumento)}
      >
        {etiquetaRegistro(v.categoria, v.tipoDocumento)}
      </span>
    </div>
  );
}

function PdfPreview({ voucherId }: { voucherId: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let activo = true;
    let objectUrl = "";
    api
      .get(`/vouchers/${voucherId}/file`, { responseType: "blob" })
      .then(({ data }) => {
        if (!activo) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [voucherId]);

  if (!url) return <div className="h-[60vh] bg-slate-100 animate-pulse rounded" />;
  return <iframe src={url} title={voucherId} className="w-full h-[60vh] rounded border border-slate-200" />;
}

// Fecha YYYY-MM-DD o ISO -> dd/mm/aaaa (sin que el huso la corra un dia).
function fmtFecha(f?: string | null): string {
  if (!f) return "—";
  const d = new Date(f);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

// Fecha YYYY-MM-DD o ISO -> YYYY-MM-DD para el input type="date".
function fechaInputValue(f?: string | null): string {
  if (!f) return "";
  const d = new Date(f);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
interface Usuario { id: string; nombre: string }

const FILTROS_INICIALES = {
  categoria: "TODAS" as string,
  grupo: "",
  tipo: "",
  usuario_id: "",
  fecha_desde: "",
  fecha_hasta: "",
  voucher_id: "",
};

export default function GaleriaPage() {
  const usuario = useAuth((s) => s.usuario);
  const esAdmin = !!usuario?.esAdmin;

  const [searchParams] = useSearchParams();
  // Filtros que llegan desde los enlaces del menu lateral
  // (/galeria?tipo=FACTURA, /galeria?grupo=PERSONAL, /galeria?categoria=XXX).
  const filtrosDeUrl = () => ({
    categoria: searchParams.get("categoria")?.toUpperCase() || "TODAS",
    grupo: searchParams.get("grupo")?.toUpperCase() || "",
    tipo: searchParams.get("tipo")?.toUpperCase() || "",
  });
  const hayFiltroUrl = () => ["categoria", "grupo", "tipo"].some((k) => searchParams.get(k));

  const [filtros, setFiltros] = useState(() => {
    if (hayFiltroUrl()) return { ...FILTROS_INICIALES, ...filtrosDeUrl() };
    const guardado = sessionStorage.getItem("filtrosGaleria");
    return guardado ? { ...FILTROS_INICIALES, ...JSON.parse(guardado) } : FILTROS_INICIALES;
  });

  // Sincronizamos el filtro cada vez que cambia la URL, salvo en el primer
  // render (ahi el useState de arriba ya decidio entre la URL y lo guardado en sesion).
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    setPage(1);
    setFiltros((f: any) => ({ ...f, ...filtrosDeUrl() }));
  }, [searchParams]);
  const [items, setItems] = useState<VoucherItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [seleccion, setSeleccion] = useState<VoucherItem | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [editando, setEditando] = useState(false);
  const [fechaEdit, setFechaEdit] = useState("");
  const [descripcionEdit, setDescripcionEdit] = useState("");
  const [categoriaEdit, setCategoriaEdit] = useState("");
  const [tipoEdit, setTipoEdit] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState("");

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsuarios(data.usuarios));
  }, [recarga]);

  useEffect(() => {
    sessionStorage.setItem("filtrosGaleria", JSON.stringify(filtros));
    const params: any = { page, limit: 20 };
    if (filtros.categoria && filtros.categoria !== "TODAS") params.categoria = filtros.categoria;
    if (filtros.grupo) params.grupo = filtros.grupo;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.usuario_id) params.usuario_id = filtros.usuario_id;
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
    if (filtros.voucher_id) params.voucher_id = filtros.voucher_id;
    api.get("/vouchers", { params }).then(({ data }) => {
      setItems(data.items);
      setTotal(data.total);
      setTotalPaginas(data.totalPaginas);
    });
  }, [filtros, page, recarga]);

  const eliminar = async (id: string) => {
    if (!confirm("¿Mover este voucher a la papelera? Podrás restaurarlo dentro de los próximos 15 días.")) return;
    try {
      await api.delete(`/vouchers/${id}`);
      setSeleccion(null);
      setRecarga((r) => r + 1);
    } catch (e) {
      alert(mensajeError(e));
    }
  };

  const abrirModal = (v: VoucherItem) => {
    setSeleccion(v);
    setEditando(false);
    setErrorEdit("");
  };
  const cerrarModal = () => {
    setSeleccion(null);
    setEditando(false);
    setErrorEdit("");
  };

  const empezarEdicion = () => {
    if (!seleccion) return;
    setFechaEdit(fechaInputValue(seleccion.fechaVoucher));
    setDescripcionEdit(seleccion.descripcion ?? "");
    setCategoriaEdit(seleccion.categoria);
    setTipoEdit(seleccion.tipoDocumento ?? "");
    setErrorEdit("");
    setEditando(true);
  };

  const guardarEdicion = async () => {
    if (!seleccion) return;
    setGuardandoEdit(true);
    setErrorEdit("");
    try {
      const payload: { fecha: string; descripcion: string; categoria?: string; tipoDocumento?: string } = {
        fecha: fechaEdit,
        descripcion: descripcionEdit,
      };
      // Solo se envian si realmente cambiaron: evita pisar una categoria
      // anterior cuando el admin no tocó el selector.
      if (categoriaEdit && categoriaEdit !== seleccion.categoria) payload.categoria = categoriaEdit;
      if (tipoEdit !== (seleccion.tipoDocumento ?? "")) payload.tipoDocumento = tipoEdit;
      const { data } = await api.patch(`/vouchers/${seleccion.voucherId}`, payload);
      setSeleccion((s) =>
        s
          ? {
              ...s,
              fechaVoucher: data.fechaVoucher,
              descripcion: data.descripcion,
              categoria: data.categoria,
              tipoDocumento: data.tipoDocumento,
            }
          : s
      );
      setEditando(false);
      setRecarga((r) => r + 1);
    } catch (e) {
      setErrorEdit(mensajeError(e));
    } finally {
      setGuardandoEdit(false);
    }
  };

  const cambiar = (campo: string, valor: string) => {
    setPage(1);
    setFiltros((f: any) => ({ ...f, [campo]: valor }));
  };

  const limpiar = () => {
    setPage(1);
    setFiltros(FILTROS_INICIALES);
  };

  // Selector de categoria: "g:ID" = toda una categoria principal, "c:CODIGO" = una subcategoria.
  const permitidas = new Set(usuario?.categorias ?? []);
  const gruposVisibles = gruposPermitidos((c) => esAdmin || permitidas.has(c));
  const tiposVisibles = TIPOS_DOCUMENTO.filter((t) => esAdmin || permitidas.has(t));
  const valorCategoria = filtros.grupo
    ? `g:${filtros.grupo}`
    : filtros.categoria && filtros.categoria !== "TODAS"
      ? `c:${filtros.categoria}`
      : "";
  const cambiarCategoria = (valor: string) => {
    setPage(1);
    setFiltros((f: any) => ({
      ...f,
      grupo: valor.startsWith("g:") ? valor.slice(2) : "",
      categoria: valor.startsWith("c:") ? valor.slice(2) : "TODAS",
    }));
  };

  const descargar = async (v: VoucherItem) => {
    const { data } = await api.get(`/vouchers/${v.voucherId}/file`, { params: { download: 1 }, responseType: "blob" });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = v.nombreArchivo ?? `${v.voucherId}.${v.formato ?? "jpg"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-primario">Galería</h1>
        <Link to="/papelera" className="btn-ghost text-sm whitespace-nowrap">🗑️ Papelera</Link>
      </div>

      {/* Filtros */}
      <div className="card grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="label">Buscar (ID o nota)</label>
          <input className="input" placeholder="Ej: GA000 o 'luz'" value={filtros.voucher_id} onChange={(e) => cambiar("voucher_id", e.target.value)} />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={filtros.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
            <option value="">Todos</option>
            <option value="VOUCHER">Vouchers</option>
            {tiposVisibles.length > 0 && <option value="DOCUMENTO">Documentos (todos)</option>}
            {tiposVisibles.map((t) => (
              <option key={t} value={t}>{etiquetaCategoria(t)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={valorCategoria} onChange={(e) => cambiarCategoria(e.target.value)}>
            <option value="">Todas</option>
            {gruposVisibles.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {g.categorias.length > 1 && <option value={`g:${g.id}`}>Todo: {g.label}</option>}
                {g.categorias.map((c) => (
                  <option key={c} value={`c:${c}`}>{etiquetaCompleta(c)}</option>
                ))}
              </optgroup>
            ))}
            <option value="g:LEGADO">Categorías anteriores</option>
          </select>
        </div>
        {esAdmin && (
          <div>
            <label className="label">Usuario</label>
            <select className="input" value={filtros.usuario_id} onChange={(e) => cambiar("usuario_id", e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Voucher desde</label>
          <input type="date" className="input" value={filtros.fecha_desde} onChange={(e) => cambiar("fecha_desde", e.target.value)} />
        </div>
        <div>
          <label className="label">Voucher hasta</label>
          <input type="date" className="input" value={filtros.fecha_hasta} onChange={(e) => cambiar("fecha_hasta", e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="btn-ghost w-full" onClick={limpiar}>Limpiar filtros</button>
        </div>
      </div>

      <p className="text-sm text-slate-500">{total} voucher(s) encontrados</p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((v) => (
          <div key={v.voucherId} className="card p-0 overflow-hidden cursor-pointer hover:shadow-md transition" onClick={() => abrirModal(v)}>
            {esPdf(v) ? (
              <div className="w-full h-40 bg-red-50 flex flex-col items-center justify-center text-red-600">
                <div className="text-3xl font-bold">PDF</div>
                {esTipoDocumento(v.tipoDocumento) && (
                  <div className="text-xs mt-1 text-red-500">{etiquetaCategoria(v.tipoDocumento)} electrónica</div>
                )}
              </div>
            ) : (
              <AuthImage voucherId={v.voucherId} className="w-full h-40 object-cover" />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold" style={{ color: colorCategoria(v.categoria) }}>
                  {v.voucherId}
                </span>
                {esPdf(v) && <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-600">PDF</span>}
              </div>
              <div className="mt-1.5">
                <Etiquetas v={v} />
              </div>
              <div className="text-sm mt-1">{v.usuario.nombre}</div>
              {v.descripcion && (
                <div className="text-xs text-slate-600 mt-1 line-clamp-2" title={v.descripcion}>
                  {v.descripcion}
                </div>
              )}
              <div className="text-xs text-slate-400 mt-1">
                {v.fechaVoucher ? `Voucher: ${fmtFecha(v.fechaVoucher)}` : `Subido: ${fmtFecha(v.fechaCarga)}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && <p className="text-center text-slate-400 py-8">No hay vouchers con estos filtros.</p>}

      {/* Paginacion */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm">Página {page} de {totalPaginas}</span>
          <button className="btn-ghost" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {/* Modal vista expandida */}
      {seleccion && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={cerrarModal}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <span className="font-mono font-bold" style={{ color: colorCategoria(seleccion.categoria) }}>
                  {seleccion.voucherId}
                </span>
                <span className="text-sm text-slate-500 ml-3">{seleccion.usuario.nombre}</span>
                <div className="mt-1">
                  <Etiquetas v={seleccion} />
                </div>
              </div>
              <button onClick={cerrarModal} className="text-2xl leading-none text-slate-400">×</button>
            </div>
            <div className="p-4">
              {esPdf(seleccion) ? (
                <PdfPreview voucherId={seleccion.voucherId} />
              ) : (
                <AuthImage voucherId={seleccion.voucherId} className="w-full object-contain max-h-[60vh]" />
              )}
            </div>
            {editando ? (
              <div className="px-4 pb-2 space-y-3 text-sm">
                <div>
                  <label className="label text-xs">Nota / descripción</label>
                  <input
                    className="input"
                    value={descripcionEdit}
                    onChange={(e) => setDescripcionEdit(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">Léela antes de elegir la categoría: suele indicar a cuál pertenece.</p>
                </div>
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select className="input" value={tipoEdit} onChange={(e) => setTipoEdit(e.target.value)}>
                    <option value="">Voucher</option>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <option key={t} value={t}>Documento · {etiquetaCategoria(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Categoría</label>
                  <select className="input" value={categoriaEdit} onChange={(e) => setCategoriaEdit(e.target.value)}>
                    {esLegado(seleccion.categoria) && (
                      <option value={seleccion.categoria}>
                        {etiquetaRegistro(seleccion.categoria, seleccion.tipoDocumento)} (anterior — elige una nueva)
                      </option>
                    )}
                    {GRUPOS.map((g) => (
                      <optgroup key={g.id} label={g.label}>
                        {g.categorias
                          .filter((c) => !(tipoEdit && SOLO_VOUCHER.includes(c as CategoriaContable)))
                          .map((c) => (
                            <option key={c} value={c}>{etiquetaCompleta(c)}</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Fecha del voucher</label>
                  <input
                    type="date"
                    className="input"
                    value={fechaEdit}
                    onChange={(e) => setFechaEdit(e.target.value)}
                  />
                </div>
                {errorEdit && <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-xs">{errorEdit}</div>}
                <div className="flex gap-2">
                  <button className="btn-primary text-sm" onClick={guardarEdicion} disabled={guardandoEdit}>
                    {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button className="btn-ghost text-sm" onClick={() => setEditando(false)} disabled={guardandoEdit}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              (seleccion.fechaVoucher || seleccion.descripcion) && (
                <div className="px-4 pb-2 space-y-1 text-sm">
                  {seleccion.fechaVoucher && (
                    <div><span className="text-slate-400">Fecha del voucher:</span> {fmtFecha(seleccion.fechaVoucher)}</div>
                  )}
                  {seleccion.descripcion && (
                    <div><span className="text-slate-400">Nota:</span> {seleccion.descripcion}</div>
                  )}
                </div>
              )
            )}
            <div className="p-4 border-t flex flex-wrap justify-between items-center gap-2">
              <span className="text-sm text-slate-500">Subido: {new Date(seleccion.fechaCarga).toLocaleString()}</span>
              <div className="flex gap-2 flex-wrap">
                {(esAdmin || usuario?.puedeDescargar) && (
                  <button className="btn-primary" onClick={() => descargar(seleccion)}>
                    {esPdf(seleccion) ? "Descargar PDF" : "Descargar original"}
                  </button>
                )}
                {esAdmin && !editando && (
                  <button className="btn-ghost text-sm" onClick={empezarEdicion}>
                    Editar
                  </button>
                )}
                <button
                  className="btn bg-red-50 text-red-600 hover:bg-red-100 text-sm"
                  onClick={() => eliminar(seleccion.voucherId)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
