import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";

const reglas = [
  { test: (p: string) => p.length >= 8, txt: "Mínimo 8 caracteres" },
  { test: (p: string) => /[A-Z]/.test(p), txt: "Una mayúscula" },
  { test: (p: string) => /[a-z]/.test(p), txt: "Una minúscula" },
  { test: (p: string) => /[0-9]/.test(p), txt: "Un número" },
  { test: (p: string) => /[!@#$%^&*]/.test(p), txt: "Un carácter especial (!@#$%^&*)" },
];

export default function CambiarPasswordPage() {
  const navigate = useNavigate();
  const setFlags = useAuth((s) => s.setFlags);
  const totpActivo = useAuth((s) => s.totpActivo);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const cumpleTodo = reglas.every((r) => r.test(nueva)) && nueva === confirmar;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await api.put("/auth/change-password", { actual, nueva, confirmar });
      setFlags({ debeCambiar: false });
      navigate(totpActivo ? "/" : "/configurar-2fa");
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold text-primario mb-1">Cambiar contraseña</h1>
        <p className="text-slate-500 text-sm mb-6">Debes establecer una contraseña segura en tu primer acceso.</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="label">Contraseña actual</label>
            <input className="input" type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input className="input" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input className="input" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>

          <ul className="text-sm space-y-1">
            {reglas.map((r) => (
              <li key={r.txt} className={r.test(nueva) ? "text-green-600" : "text-slate-400"}>
                {r.test(nueva) ? "✓" : "○"} {r.txt}
              </li>
            ))}
            <li className={nueva && nueva === confirmar ? "text-green-600" : "text-slate-400"}>
              {nueva && nueva === confirmar ? "✓" : "○"} Las contraseñas coinciden
            </li>
          </ul>

          <button className="btn-primary w-full" disabled={cargando || !cumpleTodo}>
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
        </form>
      </div>
    </div>
  );
}
