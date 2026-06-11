import { useEffect, useState } from "react";
import { api } from "../api/client";
import AuthImage from "../components/AuthImage";
import { useAuth } from "../store/auth";
import { CATEGORIAS, COLOR_CATEGORIA, LABEL_CATEGORIA, type Categoria } from "../lib/categorias";

interface VoucherItem {
  voucherId: string;
  categoria: Categoria;
  fechaCarga: string;
  usuario: { id: string; nombre: string };
}
interface Usuario { id: string; nombre: string }

const FILTROS_INICIALES = {
  categoria: "TODAS" as string,
  usuario_id: "",
  fecha_desde: "",
  fecha_hasta: "",
  voucher_id: "",
};

export default function GaleriaPage() {
  const usuario = useAuth((s) => s.usuario);
  const esAdmin = !!usuario?.esAdmin;
  // Categorias que el usuario puede ver (admin = todas).
  const visibles = (esAdmin ? CATEGORIAS : CATEGORIAS.filter((c) => usuario?.categorias.includes(c))) as Categoria[];

  const [filtros, setFiltros] = useState(() => {
    const guardado = sessionStorage.getItem("filtrosGaleria");
    return guardado ? JSON.parse(guardado) : FILTROS_INICIALES;
  });
  const [items, setItems] = useState<VoucherItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [seleccion, setSeleccion] = useState<VoucherItem | null>(null);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsuarios(data.usuarios));
    api.get("/vouchers/stats").then(({ data }) => setConteos(data.porCategoria));
  }, []);

  useEffect(() => {
    sessionStorage.setItem("filtrosGaleria", JSON.stringify(filtros));
    const params: any = { page, limit: 20 };
    if (filtros.categoria && filtros.categoria !== "TODAS") params.categoria = filtros.categoria;
    if (filtros.usuario_id) params.usuario_id = filtros.usuario_id;
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
    if (filtros.voucher_id) params.voucher_id = filtros.voucher_id;
    api.get("/vouchers", { params }).then(({ data }) => {
      setItems(data.items);
      setTotal(data.total);
      setTotalPaginas(data.totalPaginas);
    });
  }, [filtros, page]);

  const cambiar = (campo: string, valor: string) => {
    setPage(1);
    setFiltros((f: any) => ({ ...f, [campo]: valor }));
  };

  const limpiar = () => {
    setPage(1);
    setFiltros(FILTROS_INICIALES);
  };

  const totalGeneral = Object.values(conteos).reduce((a, b) => a + b, 0);

  const descargar = async (id: string) => {
    const { data } = await api.get(`/vouchers/${id}/image`, { params: { download: 1 }, responseType: "blob" });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-primario">Galería</h1>

      {/* Tabs por categoria con conteo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => cambiar("categoria", "TODAS")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${
            filtros.categoria === "TODAS" ? "bg-primario text-white border-primario" : "bg-white border-slate-200"
          }`}
        >
          Todas ({totalGeneral})
        </button>
        {visibles.map((c) => (
          <button
            key={c}
            onClick={() => cambiar("categoria", c)}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={
              filtros.categoria === c
                ? { background: COLOR_CATEGORIA[c], color: "white", borderColor: COLOR_CATEGORIA[c] }
                : { borderColor: COLOR_CATEGORIA[c], color: COLOR_CATEGORIA[c] }
            }
          >
            {LABEL_CATEGORIA[c]} ({conteos[c] ?? 0})
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="card grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="label">Buscar por ID</label>
          <input className="input" placeholder="Ej: CP000" value={filtros.voucher_id} onChange={(e) => cambiar("voucher_id", e.target.value)} />
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
          <label className="label">Desde</label>
          <input type="date" className="input" value={filtros.fecha_desde} onChange={(e) => cambiar("fecha_desde", e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
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
          <div key={v.voucherId} className="card p-0 overflow-hidden cursor-pointer hover:shadow-md transition" onClick={() => setSeleccion(v)}>
            <AuthImage voucherId={v.voucherId} className="w-full h-40 object-cover" />
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold" style={{ color: COLOR_CATEGORIA[v.categoria] }}>
                  {v.voucherId}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded text-white" style={{ background: COLOR_CATEGORIA[v.categoria] }}>
                  {LABEL_CATEGORIA[v.categoria]}
                </span>
              </div>
              <div className="text-sm mt-1">{v.usuario.nombre}</div>
              <div className="text-xs text-slate-400">{new Date(v.fechaCarga).toLocaleDateString()}</div>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSeleccion(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <span className="font-mono font-bold" style={{ color: COLOR_CATEGORIA[seleccion.categoria] }}>
                  {seleccion.voucherId}
                </span>
                <span className="text-sm text-slate-500 ml-3">{seleccion.usuario.nombre}</span>
              </div>
              <button onClick={() => setSeleccion(null)} className="text-2xl leading-none text-slate-400">×</button>
            </div>
            <div className="p-4">
              <AuthImage voucherId={seleccion.voucherId} className="w-full object-contain max-h-[60vh]" />
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-slate-500">{new Date(seleccion.fechaCarga).toLocaleString()}</span>
              {(esAdmin || usuario?.puedeDescargar) && (
                <button className="btn-primary" onClick={() => descargar(seleccion.voucherId)}>Descargar original</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
