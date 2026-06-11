import { useEffect, useState } from "react";
import { api, mensajeError } from "../api/client";
import { CATEGORIAS, COLOR_CATEGORIA, LABEL_CATEGORIA, type Categoria } from "../lib/categorias";

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

function CategoriaChips({ categorias }: { categorias: string[] }) {
  if (categorias.length === CATEGORIAS.length) return <span className="text-xs text-slate-500">Todas</span>;
  if (categorias.length === 0) return <span className="text-xs text-red-500">Ninguna</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {categorias.map((c) => (
        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: COLOR_CATEGORIA[c as Categoria] }}>
          {LABEL_CATEGORIA[c as Categoria]}
        </span>
      ))}
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

  const toggleCat = (lista: Categoria[], c: Categoria): Categoria[] =>
    lista.includes(c) ? lista.filter((x) => x !== c) : [...lista, c];

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
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((c) => {
                  const activo = nuevo.categorias.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => setNuevo({ ...nuevo, categorias: toggleCat(nuevo.categorias, c) })}
                      className="px-3 py-1.5 rounded-lg text-sm border-2"
                      style={activo ? { background: COLOR_CATEGORIA[c], color: "white", borderColor: COLOR_CATEGORIA[c] } : { borderColor: COLOR_CATEGORIA[c], color: COLOR_CATEGORIA[c] }}>
                      {LABEL_CATEGORIA[c]}
                    </button>
                  );
                })}
              </div>
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
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map((c) => {
                      const activo = editando.categorias.includes(c);
                      return (
                        <button key={c} type="button"
                          onClick={() => setEditando({ ...editando, categorias: toggleCat(editando.categorias as Categoria[], c) })}
                          className="px-3 py-1.5 rounded-lg text-sm border-2"
                          style={activo ? { background: COLOR_CATEGORIA[c], color: "white", borderColor: COLOR_CATEGORIA[c] } : { borderColor: COLOR_CATEGORIA[c], color: COLOR_CATEGORIA[c] }}>
                          {LABEL_CATEGORIA[c]}
                        </button>
                      );
                    })}
                  </div>
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
