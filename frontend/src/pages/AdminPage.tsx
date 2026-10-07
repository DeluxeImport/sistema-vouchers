import { useEffect, useState } from "react";
import { api, mensajeError } from "../api/client";
import {
  CATEGORIAS,
  CATEGORIAS_LEGADO,
  GRUPOS,
  TIPOS_DOCUMENTO,
  bloquesPorSubgrupo,
  colorCategoria,
  etiquetaCategoria,
  type Categoria,
} from "../lib/categorias";

interface UsuarioAdmin {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  categorias: string[];
  puedeSubir: boolean;
  puedeVerGaleria: boolean;
  puedeVerDashboard: boolean;
  puedeDescargar: boolean;
  debeCambiar: boolean;
  totpActivo: boolean;
  ultimoAcceso: string | null;
  totalVouchers: number;
}

type PermKey = "puedeSubir" | "puedeVerGaleria" | "puedeVerDashboard" | "puedeDescargar";
const PERMISOS: { key: PermKey; label: string }[] = [
  { key: "puedeSubir", label: "Subir" },
  { key: "puedeVerGaleria", label: "Ver galería" },
  { key: "puedeVerDashboard", label: "Ver dashboard" },
  { key: "puedeDescargar", label: "Descargar" },
];

function ChipCategoria({ c, activo, onClick }: { c: Categoria; activo: boolean; onClick: () => void }) {
  const color = colorCategoria(c);
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs border-2 text-left"
      style={activo ? { background: color, color: "white", borderColor: color } : { borderColor: `${color}88`, color }}
    >
      {etiquetaCategoria(c)}
    </button>
  );
}

// Bloque de un grupo de categorias con boton para marcar/desmarcar todo el grupo.
function BloqueGrupo({
  titulo,
  color,
  categorias,
  seleccionadas,
  onChange,
}: {
  titulo: string;
  color?: string;
  categorias: readonly Categoria[];
  seleccionadas: Categoria[];
  onChange: (lista: Categoria[]) => void;
}) {
  const marcadas = categorias.filter((c) => seleccionadas.includes(c)).length;
  const todas = marcadas === categorias.length;
  const alternarGrupo = () =>
    onChange(
      todas
        ? seleccionadas.filter((c) => !categorias.includes(c))
        : [...seleccionadas, ...categorias.filter((c) => !seleccionadas.includes(c))]
    );
  const alternar = (c: Categoria) =>
    onChange(seleccionadas.includes(c) ? seleccionadas.filter((x) => x !== c) : [...seleccionadas, c]);

  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase">
          {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
          {titulo}
          <span className="font-normal normal-case text-slate-400">
            ({marcadas}/{categorias.length})
          </span>
        </div>
        <button type="button" onClick={alternarGrupo} className="text-xs text-acento hover:underline">
          {todas ? "Quitar todas" : "Marcar todas"}
        </button>
      </div>
      {categorias.length > 1 && (
        <div className="space-y-1.5">
          {bloquesPorSubgrupo(categorias).map((b, i) => (
            <div key={b.titulo ?? `b${i}`}>
              {b.titulo && <div className="text-[11px] text-slate-400 mb-1">{b.titulo}</div>}
              <div className="flex flex-wrap gap-1.5">
                {b.categorias.map((c) => (
                  <ChipCategoria key={c} c={c} activo={seleccionadas.includes(c)} onClick={() => alternar(c)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Selector de categorias permitidas, agrupado por categoria principal.
// Los tipos de documento definen ademas que documentos puede subir/ver.
function SelectorCategorias({
  seleccionadas,
  onChange,
}: {
  seleccionadas: Categoria[];
  onChange: (lista: Categoria[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-xs">
        <button type="button" className="text-acento hover:underline" onClick={() => onChange([...CATEGORIAS])}>
          Marcar todo
        </button>
        <button type="button" className="text-slate-500 hover:underline" onClick={() => onChange([])}>
          Quitar todo
        </button>
      </div>
      <BloqueGrupo
        titulo="Tipos de documento (puede subir/ver documentos)"
        categorias={TIPOS_DOCUMENTO}
        seleccionadas={seleccionadas}
        onChange={onChange}
      />
      <div className="grid gap-2 lg:grid-cols-2">
        {GRUPOS.map((g) => (
          <BloqueGrupo
            key={g.id}
            titulo={g.label}
            color={g.color}
            categorias={g.categorias}
            seleccionadas={seleccionadas}
            onChange={onChange}
          />
        ))}
      </div>
      <details className="rounded-lg border border-dashed border-slate-200 p-2.5">
        <summary className="cursor-pointer text-xs font-semibold text-slate-400 uppercase">
          Categorías anteriores (vouchers históricos)
        </summary>
        <div className="mt-2">
          <BloqueGrupo
            titulo="Anteriores"
            categorias={CATEGORIAS_LEGADO}
            seleccionadas={seleccionadas}
            onChange={onChange}
          />
        </div>
      </details>
    </div>
  );
}

// Resumen compacto en la tabla: cuantas subcategorias tiene de cada grupo.
function CategoriaChips({ categorias }: { categorias: string[] }) {
  const set = new Set(categorias);
  if (CATEGORIAS.every((c) => set.has(c))) return <span className="text-xs text-slate-500">Todas</span>;
  if (categorias.length === 0) return <span className="text-xs text-red-500">Ninguna</span>;
  const tipos = TIPOS_DOCUMENTO.filter((t) => set.has(t));
  return (
    <div className="flex flex-wrap gap-1">
      {tipos.length > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
          Docs: {tipos.map((t) => etiquetaCategoria(t)).join(", ")}
        </span>
      )}
      {GRUPOS.map((g) => {
        const n = g.categorias.filter((c) => set.has(c)).length;
        if (n === 0) return null;
        return (
          <span
            key={g.id}
            className="text-[10px] px-1.5 py-0.5 rounded text-white"
            style={{ background: g.color }}
            title={g.label}
          >
            {g.label.split(" ")[0]}
            {n < g.categorias.length ? ` ${n}/${g.categorias.length}` : ""}
          </span>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);

  // formulario de creacion
  const [nuevo, setNuevo] = useState({
    nombre: "",
    username: "",
    rol: "USUARIO" as "USUARIO" | "ADMIN",
    categorias: [...CATEGORIAS] as Categoria[],
    puedeSubir: true,
    puedeVerGaleria: true,
    puedeVerDashboard: true,
    puedeDescargar: true,
  });

  const cargar = () => {
    api.get("/users/admin/list").then(({ data }) => setUsuarios(data.usuarios)).catch((e) => setError(mensajeError(e)));
  };
  useEffect(cargar, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setAviso("");
    try {
      const { data } = await api.post("/users", nuevo);
      setAviso(`Usuario ${data.username} creado. Contraseña temporal: ${data.passwordTemporal}`);
      setNuevo({ nombre: "", username: "", rol: "USUARIO", categorias: [...CATEGORIAS], puedeSubir: true, puedeVerGaleria: true, puedeVerDashboard: true, puedeDescargar: true });
      cargar();
    } catch (e2) {
      setError(mensajeError(e2));
    }
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setError(""); setAviso("");
    try {
      await api.patch(`/users/${editando.id}`, {
        nombre: editando.nombre,
        rol: editando.rol,
        categorias: editando.categorias,
        puedeSubir: editando.puedeSubir,
        puedeVerGaleria: editando.puedeVerGaleria,
        puedeVerDashboard: editando.puedeVerDashboard,
        puedeDescargar: editando.puedeDescargar,
      });
      setEditando(null);
      setAviso("Cambios guardados.");
      cargar();
    } catch (e2) {
      setError(mensajeError(e2));
    }
  };

  const resetPassword = async (u: UsuarioAdmin) => {
    setError(""); setAviso("");
    try {
      const { data } = await api.post(`/users/${u.id}/reset-password`);
      setAviso(`Contraseña de ${u.username} restablecida. Nueva temporal: ${data.passwordTemporal}`);
    } catch (e2) { setError(mensajeError(e2)); }
  };

  const reset2fa = async (u: UsuarioAdmin) => {
    setError(""); setAviso("");
    try {
      await api.post(`/users/${u.id}/reset-2fa`);
      setAviso(`2FA de ${u.username} restablecido. Reconfigurará al ingresar.`);
      cargar();
    } catch (e2) { setError(mensajeError(e2)); }
  };

  const eliminar = async (u: UsuarioAdmin) => {
    if (!confirm(`¿Eliminar a ${u.username}? Esta acción no se puede deshacer.`)) return;
    setError(""); setAviso("");
    try {
      await api.delete(`/users/${u.id}`);
      setAviso(`Usuario ${u.username} eliminado.`);
      cargar();
    } catch (e2) { setError(mensajeError(e2)); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primario">Administración de usuarios</h1>

      {aviso && <div className="rounded-lg bg-green-50 text-green-800 px-3 py-2 text-sm font-medium">{aviso}</div>}
      {error && <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      {/* Crear usuario */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Crear nuevo usuario</h2>
        <form onSubmit={crear} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label">Nombre de usuario</label>
              <input className="input" value={nuevo.username} onChange={(e) => setNuevo({ ...nuevo, username: e.target.value })} required />
              <p className="text-xs text-slate-400 mt-1">Para el login. Sin espacios ni acentos; solo letras, números, punto o guion bajo.</p>
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as "USUARIO" | "ADMIN" })}>
                <option value="USUARIO">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>

          {nuevo.rol === "USUARIO" && (
            <div>
              <label className="label">Categorías permitidas</label>
              <SelectorCategorias
                seleccionadas={nuevo.categorias}
                onChange={(lista) => setNuevo({ ...nuevo, categorias: lista })}
              />
            </div>
          )}

          <div>
            <label className="label">Permisos</label>
            <div className="flex flex-wrap gap-4">
              {PERMISOS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={nuevo[p.key] as boolean} onChange={(e) => setNuevo({ ...nuevo, [p.key]: e.target.checked })} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <button className="btn-primary">Crear usuario</button>
        </form>
      </div>

      {/* Tabla de usuarios */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-3">Usuarios ({usuarios.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2">Usuario</th>
              <th>Rol</th>
              <th>Categorías</th>
              <th>Permisos</th>
              <th>Vouchers</th>
              <th>2FA</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 align-top">
                <td className="py-2">
                  <div className="font-medium">{u.nombre}</div>
                  <div className="text-xs text-slate-400">{u.username} · {u.id}</div>
                </td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded ${u.rol === "ADMIN" ? "bg-primario text-white" : "bg-slate-100 text-slate-600"}`}>
                    {u.rol === "ADMIN" ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td className="max-w-[180px]"><CategoriaChips categorias={u.rol === "ADMIN" ? [...CATEGORIAS] : u.categorias} /></td>
                <td className="text-xs text-slate-600">
                  {PERMISOS.filter((p) => u[p.key]).map((p) => p.label).join(", ") || "—"}
                </td>
                <td>{u.totalVouchers}</td>
                <td>{u.totpActivo ? "✓" : "—"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button className="btn-ghost text-xs px-2 py-1" onClick={() => setEditando(u)}>Editar</button>
                    <button className="btn-ghost text-xs px-2 py-1" onClick={() => resetPassword(u)}>Reset clave</button>
                    <button className="btn-ghost text-xs px-2 py-1" onClick={() => reset2fa(u)}>Reset 2FA</button>
                    <button className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50" onClick={() => eliminar(u)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edicion */}
      {editando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Editar {editando.username}</h3>
              <button onClick={() => setEditando(null)} className="text-2xl leading-none text-slate-400">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Nombre completo</label>
                <input className="input" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
              </div>
              <div>
                <label className="label">Rol</label>
                <select className="input" value={editando.rol} onChange={(e) => setEditando({ ...editando, rol: e.target.value })}>
                  <option value="USUARIO">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              {editando.rol === "USUARIO" && (
                <div>
                  <label className="label">Categorías permitidas</label>
                  <SelectorCategorias
                    seleccionadas={editando.categorias as Categoria[]}
                    onChange={(lista) => setEditando({ ...editando, categorias: lista })}
                  />
                </div>
              )}
              <div>
                <label className="label">Permisos</label>
                <div className="flex flex-wrap gap-4">
                  {PERMISOS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editando[p.key] as boolean} onChange={(e) => setEditando({ ...editando, [p.key]: e.target.checked })} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
