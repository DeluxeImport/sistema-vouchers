import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import { api } from "../api/client";
import { useAuth } from "../store/auth";
import {
  CATEGORIAS_LEGADO,
  TIPOS_DOCUMENTO,
  colorCategoria,
  colorTipo,
  etiquetaCategoria,
  etiquetaCompleta,
  gruposPermitidos,
} from "../lib/categorias";

interface Stats {
  total: number;
  porCategoria: Record<string, number>;
  porTipo: Record<string, number>;
  recientes: any[];
}
interface UserStat {
  id: string;
  nombre: string;
  total: number;
  porCategoria: Record<string, number>;
  ultimoVoucher: string | null;
}

const COLOR_ANTERIORES = "#94A3B8";
// Categorias "anteriores": estructura vieja + documentos historicos sin categoria contable.
const ANTERIORES: readonly string[] = [...CATEGORIAS_LEGADO, ...TIPOS_DOCUMENTO];

function sumar(conteos: Record<string, number> | undefined, categorias: readonly string[]): number {
  return categorias.reduce((suma, c) => suma + (conteos?.[c] ?? 0), 0);
}

export default function DashboardPage() {
  const usuario = useAuth((s) => s.usuario);
  const esAdmin = !!usuario?.esAdmin;
  const permitidas = new Set(usuario?.categorias ?? []);
  const grupos = gruposPermitidos((c) => esAdmin || permitidas.has(c));

  const [stats, setStats] = useState<Stats | null>(null);
  const [usuarios, setUsuarios] = useState<UserStat[]>([]);
  const [meses, setMeses] = useState<{ mes: string; total: number }[]>([]);
  const [grupoDetalle, setGrupoDetalle] = useState("");

  useEffect(() => {
    api.get("/vouchers/stats").then(({ data }) => setStats(data));
    api.get("/vouchers/stats/by-month").then(({ data }) => setMeses(data.meses));
    if (esAdmin) api.get("/vouchers/stats/by-user").then(({ data }) => setUsuarios(data.usuarios));
  }, [esAdmin]);

  const totalAnteriores = sumar(stats?.porCategoria, ANTERIORES);
  const dataDonaPrincipal = [
    ...grupos.map((g) => ({ name: g.label, color: g.color, value: sumar(stats?.porCategoria, g.categorias) })),
    ...(totalAnteriores > 0 ? [{ name: "Categorías anteriores", color: COLOR_ANTERIORES, value: totalAnteriores }] : []),
  ];

  // Detalle: subcategorias del grupo elegido (por defecto, el de mas registros).
  const conSubcategorias = grupos.filter((g) => g.categorias.length > 1);
  const grupoPorDefecto = [...conSubcategorias].sort(
    (a, b) => sumar(stats?.porCategoria, b.categorias) - sumar(stats?.porCategoria, a.categorias)
  )[0];
  const grupoElegido = conSubcategorias.find((g) => g.id === grupoDetalle) ?? grupoPorDefecto;
  const dataDetalle = (grupoElegido?.categorias ?? []).map((c) => ({
    name: etiquetaCompleta(c),
    value: stats?.porCategoria[c] ?? 0,
  }));

  const totalDocumentos = TIPOS_DOCUMENTO.reduce((s, t) => s + (stats?.porTipo?.[t] ?? 0), 0);
  const mesActual = meses[meses.length - 1]?.total ?? 0;
  const mesAnterior = meses[meses.length - 2]?.total ?? 0;
  const tendencia = mesActual - mesAnterior;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primario">Dashboard</h1>

      {/* Totales por tipo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card" style={{ borderTopColor: "#1E3A5F", borderTopWidth: 4 }}>
          <div className="text-sm text-slate-500">Total</div>
          <div className="text-3xl font-bold text-primario">{stats?.total ?? 0}</div>
        </div>
        <div className="card" style={{ borderTopColor: "#3B82F6", borderTopWidth: 4 }}>
          <div className="text-sm text-slate-500">Vouchers</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.porTipo?.VOUCHER ?? 0}</div>
        </div>
        <div className="card col-span-2 lg:col-span-1" style={{ borderTopColor: "#DB2777", borderTopWidth: 4 }}>
          <div className="text-sm text-slate-500">Documentos</div>
          <div className="text-3xl font-bold text-pink-600">{totalDocumentos}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {TIPOS_DOCUMENTO.map((t) => (
              <span key={t} style={{ color: colorTipo(t) }}>
                {etiquetaCategoria(t)}: {stats?.porTipo?.[t] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contadores por categoria principal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {grupos.map((g) => (
          <div key={g.id} className="card" style={{ borderTopColor: g.color, borderTopWidth: 4 }}>
            <div className="text-sm text-slate-500 leading-tight min-h-[2.5em]">{g.label}</div>
            <div className="text-3xl font-bold" style={{ color: g.color }}>
              {sumar(stats?.porCategoria, g.categorias)}
            </div>
          </div>
        ))}
        {totalAnteriores > 0 && (
          <div className="card" style={{ borderTopColor: COLOR_ANTERIORES, borderTopWidth: 4 }}>
            <div className="text-sm text-slate-500 leading-tight min-h-[2.5em]">Categorías anteriores</div>
            <div className="text-3xl font-bold text-slate-500">{totalAnteriores}</div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dona */}
        <div className="card">
          <h2 className="font-semibold mb-2">Distribución por categoría</h2>
          <div className="text-sm text-slate-500 mb-2">Total: {stats?.total ?? 0} registros</div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={dataDonaPrincipal} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {dataDonaPrincipal.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={meses}>
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detalle de subcategorias de una categoria principal */}
      {grupoElegido && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h2 className="font-semibold">Detalle por subcategoría</h2>
            <select
              className="input w-auto"
              value={grupoElegido.id}
              onChange={(e) => setGrupoDetalle(e.target.value)}
            >
              {conSubcategorias.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(160, dataDetalle.length * 34)}>
            <BarChart data={dataDetalle} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Registros" fill={grupoElegido.color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Actividad reciente */}
      <div className="card">
        <h2 className="font-semibold mb-3">Actividad reciente</h2>
        <div className="space-y-2">
          {stats?.recientes.length === 0 && <p className="text-slate-400 text-sm">Aún no hay registros.</p>}
          {stats?.recientes.map((v) => (
            <div key={v.voucherId} className="flex items-center gap-3 border-b border-slate-100 pb-2">
              <span
                className="text-xs font-mono px-2 py-1 rounded text-white"
                style={{ background: colorCategoria(v.categoria) }}
              >
                {v.voucherId}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {v.tipoDocumento ? etiquetaCategoria(v.tipoDocumento) : "Voucher"}
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
                {grupos.map((g) => (
                  <th key={g.id} className="px-1 text-xs font-medium" title={g.label}>
                    {g.label.split(" ")[0]}
                  </th>
                ))}
                <th className="px-1 text-xs font-medium">Anteriores</th>
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2">{u.nombre}</td>
                  <td className="font-semibold">{u.total}</td>
                  {grupos.map((g) => (
                    <td key={g.id} className="px-1">{sumar(u.porCategoria, g.categorias)}</td>
                  ))}
                  <td className="px-1">{sumar(u.porCategoria, ANTERIORES)}</td>
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
