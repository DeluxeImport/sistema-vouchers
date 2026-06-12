import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, mensajeError } from "../api/client";
import AuthImage from "../components/AuthImage";
import { COLOR_CATEGORIA, LABEL_CATEGORIA, type Categoria } from "../lib/categorias";

interface PapeleraItem {
  voucherId: string;
  categoria: Categoria;
  fechaCarga: string;
  fechaVoucher?: string | null;
  descripcion?: string | null;
  eliminadoEn: string;
  diasRestantes: number;
  usuario: { id: string; nombre: string };
}

export default function PapeleraPage() {
  const [items, setItems] = useState<PapeleraItem[]>([]);
  const [dias, setDias] = useState(15);
  const [cargado, setCargado] = useState(false);

  const cargar = () => {
    api
      .get("/vouchers/papelera")
      .then(({ data }) => {
        setItems(data.items);
        setDias(data.diasPapelera ?? 15);
      })
      .finally(() => setCargado(true));
  };
  useEffect(cargar, []);

  const restaurar = async (id: string) => {
    try {
      await api.post(`/vouchers/${id}/restaurar`);
      cargar();
    } catch (e) {
      alert(mensajeError(e));
    }
  };

  const borrarDef = async (id: string) => {
    if (!confirm(`¿Eliminar DEFINITIVAMENTE ${id}? Esta acción NO se puede deshacer.`)) return;
    try {
      await api.delete(`/vouchers/${id}/permanente`);
      cargar();
    } catch (e) {
      alert(mensajeError(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-primario">🗑️ Papelera</h1>
        <Link to="/galeria" className="btn-ghost text-sm whitespace-nowrap">← Volver a la galería</Link>
      </div>

      <div className="rounded-lg bg-amber-50 text-amber-800 px-3 py-2 text-sm">
        Los vouchers en la papelera se eliminan <strong>definitivamente a los {dias} días</strong>.
        Mientras tanto puedes restaurarlos.
      </div>

      {cargado && items.length === 0 && (
        <p className="text-center text-slate-400 py-10">La papelera está vacía. 🧹</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((v) => (
          <div key={v.voucherId} className="card p-0 overflow-hidden flex flex-col">
            <div className="relative">
              <AuthImage voucherId={v.voucherId} className="w-full h-40 object-cover opacity-80" />
              <span
                className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded text-white ${
                  v.diasRestantes <= 3 ? "bg-red-600" : "bg-slate-700/80"
                }`}
              >
                Se borra en {v.diasRestantes} día{v.diasRestantes === 1 ? "" : "s"}
              </span>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold" style={{ color: COLOR_CATEGORIA[v.categoria] }}>
                  {v.voucherId}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded text-white" style={{ background: COLOR_CATEGORIA[v.categoria] }}>
                  {LABEL_CATEGORIA[v.categoria]}
                </span>
              </div>
              <div className="text-sm mt-1">{v.usuario.nombre}</div>
              {v.descripcion && (
                <div className="text-xs text-slate-500 mt-1 line-clamp-2" title={v.descripcion}>{v.descripcion}</div>
              )}
              <div className="mt-3 flex gap-2 flex-wrap">
                <button className="btn-primary text-xs flex-1 min-w-[90px]" onClick={() => restaurar(v.voucherId)}>
                  Restaurar
                </button>
                <button
                  className="btn bg-red-50 text-red-600 hover:bg-red-100 text-xs flex-1 min-w-[90px]"
                  onClick={() => borrarDef(v.voucherId)}
                >
                  Borrar ya
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
