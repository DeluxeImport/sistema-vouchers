import { useEffect, useState } from "react";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";

// Oculta de momento la tarjeta "Bot de Telegram" (vincular/desvincular) mientras
// el bot no funciona correctamente. La logica y los endpoints siguen intactos:
// para volver a mostrarla basta con poner true.
const MOSTRAR_BOT_TELEGRAM = false;

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

  // Vinculacion con el bot de Telegram
  const [vinculando, setVinculando] = useState(false);
  const [linkTelegram, setLinkTelegram] = useState<{ deepLink: string | null; token: string; expiraEn: string } | null>(null);
  const [errTelegram, setErrTelegram] = useState("");

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

  const vincularTelegram = async () => {
    setErrTelegram("");
    setVinculando(true);
    try {
      const { data } = await api.post("/users/me/telegram/token");
      setLinkTelegram(data);
      if (data.deepLink) window.open(data.deepLink, "_blank");
    } catch (e) {
      setErrTelegram(mensajeError(e));
    } finally {
      setVinculando(false);
    }
  };

  const desvincularTelegram = async () => {
    if (!confirm("¿Desvincular tu cuenta de Telegram? El bot dejara de reconocerte hasta que vuelvas a vincularla.")) return;
    setErrTelegram("");
    try {
      await api.delete("/users/me/telegram");
      setLinkTelegram(null);
      cargar();
    } catch (e) {
      setErrTelegram(mensajeError(e));
    }
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

      {/* Vinculacion con el bot de Telegram (oculta por MOSTRAR_BOT_TELEGRAM) */}
      {MOSTRAR_BOT_TELEGRAM && (
      <div className="card">
        <h2 className="font-semibold mb-3">Bot de Telegram</h2>
        {errTelegram && <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{errTelegram}</div>}
        {perfil?.telegramVinculado ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-green-700 font-medium">Vinculado ✓ — puedes mandar comprobantes por Telegram.</span>
            <button className="btn-ghost text-sm" onClick={desvincularTelegram}>Desvincular</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Vincula tu cuenta para mandar fotos de comprobantes directo por Telegram en vez de subirlas aquí.
            </p>
            <button className="btn-primary text-sm" onClick={vincularTelegram} disabled={vinculando}>
              {vinculando ? "Generando enlace..." : "Vincular Telegram"}
            </button>
            {linkTelegram && (
              <div className="rounded-lg bg-blue-50 text-blue-800 px-3 py-2 text-sm space-y-1">
                {linkTelegram.deepLink ? (
                  <p>
                    Se abrió una pestaña nueva con el bot. Si no se abrió,{" "}
                    <a className="underline font-medium" href={linkTelegram.deepLink} target="_blank" rel="noreferrer">
                      haz clic aquí
                    </a>
                    .
                  </p>
                ) : (
                  <p>Abre el bot en Telegram y envía: <code className="font-mono">/start {linkTelegram.token}</code></p>
                )}
                <p className="text-xs text-blue-600">
                  Vence a las {new Date(linkTelegram.expiraEn).toLocaleTimeString()} — si se vence, genera un enlace nuevo.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

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
