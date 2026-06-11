import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSesion = useAuth((s) => s.setSesion);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Estado del segundo paso 2FA
  const [paso2fa, setPaso2fa] = useState(false);
  const [token2fa, setToken2fa] = useState("");
  const [codigo, setCodigo] = useState("");
  const [usarBackup, setUsarBackup] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      if (data.requiere2FA) {
        setToken2fa(data.token2fa);
        setPaso2fa(true);
      } else {
        setSesion(data);
        navigate("/");
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  const verificar2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const endpoint = usarBackup ? "/auth/backup-code" : "/auth/verify-2fa";
      const { data } = await api.post(endpoint, { token2fa, codigo });
      setSesion(data);
      navigate("/");
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-primario mb-1">Sistema de Vouchers</h1>
        <p className="text-slate-500 text-sm mb-6">
          {paso2fa ? "Verificación en dos pasos" : "Inicia sesión para continuar"}
        </p>

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

        {!paso2fa ? (
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="label">Usuario</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        ) : (
          <form onSubmit={verificar2fa} className="space-y-4">
            <div>
              <label className="label">
                {usarBackup ? "Código de respaldo" : "Código de 6 dígitos (app autenticadora)"}
              </label>
              <input
                className="input tracking-widest text-center text-lg"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder={usarBackup ? "XXXXX-XXXXX" : "000000"}
                autoFocus
              />
            </div>
            <button className="btn-primary w-full" disabled={cargando}>
              {cargando ? "Verificando..." : "Verificar"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-acento underline"
              onClick={() => {
                setUsarBackup(!usarBackup);
                setCodigo("");
              }}
            >
              {usarBackup ? "Usar código de la app" : "Usar un código de respaldo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
