import { useEffect, useState } from "react";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";

export default function PerfilPage() {
  const usuario = useAuth((s) => s.usuario);
  const totpActivo = useAuth((s) => s.totpActivo);
  const logout = useAuth((s) => s.logout);

  const [perfil, setPerfil] = useState<any>(null);
  const [sesiones, setSesiones] = useState<any[]>([]);

  // cambio de password inline
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const cargar = () => {
    if (!usuario) return;
    api.get(`/users/${usuario.id}`).then(({ data }) => setPerfil(data));
    api.get(`/users/${usuario.id}/sessions`).then(({ data }) => setSesiones(data.sesiones));
  };

  useEffect(cargar, [usuario]);

  const cambiarPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      await api.put("/auth/change-password", { actual, nueva, confirmar });
      setMsg("Contraseña actualizada correctamente.");
      setActual(""); setNueva(""); setConfirmar("");
    } catch (e2) {
      setErr(mensajeError(e2));
    }
  };

  const cerrarTodas = async () => {
    if (!usuario) return;
    await api.delete(`/users/${usuario.id}/sessions`);
    await logout();
    location.href = "/login";
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-primario">Perfil</h1>

      <div className="card grid sm:grid-cols-2 gap-4">
        <div>
          <div className="label">Nombre completo</div>
          <div className="font-medium">{perfil?.nombre ?? usuario?.nombre}</div>
        </div>
        <div>
          <div className="label">Nombre de usuario</div>
          <div className="font-medium">{perfil?.username ?? usuario?.username}</div>
        </div>
        <div>
          <div className="label">Fecha de registro</div>
          <div className="font-medium">{perfil?.creadoEn ? new Date(perfil.creadoEn).toLocaleDateString() : "—"}</div>
        </div>
        <div>
          <div className="label">Último acceso</div>
          <div className="font-medium">{perfil?.ultimoAcceso ? new Date(perfil.ultimoAcceso).toLocaleString() : "—"}</div>
        </div>
        <div>
          <div className="label">Total de vouchers</div>
          <div className="font-medium">{perfil?.totalVouchers ?? 0}</div>
        </div>
        <div>
          <div className="label">2FA</div>
          <div className="font-medium">{totpActivo ? "Activo ✓" : "Inactivo"}</div>
        </div>
      </div>

      {/* Cambiar contrasena */}
      <div className="card">
        <h2 className="font-semibold mb-3">Cambiar contraseña</h2>
        {msg && <div className="mb-3 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">{msg}</div>}
        {err && <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
        <form onSubmit={cambiarPwd} className="grid sm:grid-cols-3 gap-3">
          <input className="input" type="password" placeholder="Actual" value={actual} onChange={(e) => setActual(e.target.value)} />
          <input className="input" type="password" placeholder="Nueva" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <input className="input" type="password" placeholder="Confirmar" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          <button className="btn-primary sm:col-span-3">Actualizar contraseña</button>
        </form>
      </div>

      {/* Historial de sesiones */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Historial de sesiones (últimas 10)</h2>
          <button className="btn-ghost text-sm" onClick={cerrarTodas}>Cerrar todas las sesiones</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2">Fecha</th>
              <th>IP</th>
              <th>Dispositivo</th>
            </tr>
          </thead>
          <tbody>
            {sesiones.map((s) => (
              <tr key={s.id} className="border-b border-slate-50">
                <td className="py-2">{new Date(s.creadoEn).toLocaleString()}</td>
                <td>{s.ip}</td>
                <td className="text-xs text-slate-400 truncate max-w-xs">{s.userAgent}</td>
              </tr>
            ))}
            {sesiones.length === 0 && (
              <tr><td colSpan={3} className="py-3 text-slate-400 text-center">Sin sesiones registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
