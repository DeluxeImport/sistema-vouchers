import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import { api } from "../api/client";
import { useAuth } from "../store/auth";
import { CATEGORIAS, COLOR_CATEGORIA, LABEL_CATEGORIA, type Categoria } from "../lib/categorias";

interface Stats {
  total: number;
  porCategoria: Record<string, number>;
  recientes: any[];
}
interface UserStat {
  id: string;
  nombre: string;
  total: number;
  porCategoria: Record<string, number>;
  ultimoVoucher: string | null;
}

export default function DashboardPage() {
  const usuario = useAuth((s) => s.usuario);
  const esAdmin = !!usuario?.esAdmin;
  // Categorias visibles para el usuario (admin = todas).
  const visibles = (esAdmin ? CATEGORIAS : CATEGORIAS.filter((c) => usuario?.categorias.includes(c))) as Categoria[];

  const [stats, setStats] = useState<Stats | null>(null);
  const [usuarios, setUsuarios] = useState<UserStat[]>([]);
  const [meses, setMeses] = useState<{ mes: string; total: number }[]>([]);

  useEffect(() => {
    api.get("/vouchers/stats").then(({ data }) => setStats(data));
    api.get("/vouchers/stats/by-month").then(({ data }) => setMeses(data.meses));
    if (esAdmin) api.get("/vouchers/stats/by-user").then(({ data }) => setUsuarios(data.usuarios));
  }, [esAdmin]);

  const dataDona = visibles.map((c) => ({ name: LABEL_CATEGORIA[c], value: stats?.porCategoria[c] ?? 0, cat: c }));
  const mesActual = meses[meses.length - 1]?.total ?? 0;
  const mesAnterior = meses[meses.length - 2]?.total ?? 0;
  const tendencia = mesActual - mesAnterior;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primario">Dashboard</h1>

      {/* Contadores por categoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {visibles.map((c) => (
          <div key={c} className="card" style={{ borderTopColor: COLOR_CATEGORIA[c], borderTopWidth: 4 }}>
            <div className="text-sm text-slate-500">{LABEL_CATEGORIA[c]}</div>
            <div className="text-3xl font-bold" style={{ color: COLOR_CATEGORIA[c] }}>
              {stats?.porCategoria[c] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dona */}
        <div className="card">
          <h2 className="font-semibold mb-2">Distribución por categoría</h2>
          <div className="text-sm text-slate-500 mb-2">Total: {stats?.total ?? 0} vouchers</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={dataDona} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {dataDona.map((d) => (
                  <Cell key={d.cat} fill={COLOR_CATEGORIA[d.cat as Categoria]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Barras mensuales */}
        <div className="card">
          <h2 className="font-semibold mb-2">Actividad por mes (últimos 12)</h2>
          <div className="text-sm mb-2">
            Tendencia:{" "}
            <span className={tendencia >= 0 ? "text-green-600" : "text-red-600"}>
              {tendencia >= 0 ? "▲" : "▼"} {Math.abs(tendencia)} vs. mes anterior
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={meses}>
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="card">
        <h2 className="font-semibold mb-3">Actividad reciente</h2>
        <div className="space-y-2">
          {stats?.recientes.length === 0 && <p className="text-slate-400 text-sm">Aún no hay vouchers.</p>}
          {stats?.recientes.map((v) => (
            <div key={v.voucherId} className="flex items-center gap-3 border-b border-slate-100 pb-2">
              <span
                className="text-xs font-mono px-2 py-1 rounded text-white"
                style={{ background: COLOR_CATEGORIA[v.categoria as Categoria] }}
              >
                {v.voucherId}
              </span>
              <span className="text-sm flex-1">{v.usuario.nombre}</span>
              <span className="text-xs text-slate-400">{new Date(v.fechaCarga).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla por usuario (solo admin) */}
      {esAdmin && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold mb-3">Actividad por usuario</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Usuario</th>
                <th>Total</th>
                {visibles.map((c) => <th key={c}>{LABEL_CATEGORIA[c]}</th>)}
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2">{u.nombre}</td>
                  <td className="font-semibold">{u.total}</td>
                  {visibles.map((c) => <td key={c}>{u.porCategoria[c] ?? 0}</td>)}
                  <td className="text-xs text-slate-400">
                    {u.ultimoVoucher ? new Date(u.ultimoVoucher).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
