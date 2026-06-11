import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, mensajeError } from "../api/client";
import { useAuth } from "../store/auth";

export default function Setup2FAPage() {
  const navigate = useNavigate();
  const setFlags = useAuth((s) => s.setFlags);

  const [qr, setQr] = useState("");
  const [secreto, setSecreto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    api
      .post("/auth/setup-2fa")
      .then(({ data }) => {
        setQr(data.qr);
        setSecreto(data.secreto);
      })
      .catch((e) => setError(mensajeError(e)));
  }, []);

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const { data } = await api.post("/auth/confirm-2fa", { codigo });
      setBackupCodes(data.backupCodes);
      setFlags({ totpActivo: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  if (backupCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fondo px-4">
        <div className="card w-full max-w-md">
          <h1 className="text-xl font-bold text-primario mb-1">Códigos de respaldo</h1>
          <p className="text-slate-500 text-sm mb-4">
            Guárdalos en un lugar seguro. Cada código sirve una sola vez y NO se volverán a mostrar.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {backupCodes.map((c) => (
              <code key={c} className="rounded bg-slate-100 px-3 py-2 text-center font-mono text-sm">{c}</code>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => navigate("/")}>
            Ya los guardé, continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo px-4 py-8">
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold text-primario mb-1">Configurar 2FA</h1>
        <p className="text-slate-500 text-sm mb-4">
          Escanea el código QR con Google Authenticator, Authy o Microsoft Authenticator.
        </p>

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

        {qr && (
          <div className="flex flex-col items-center mb-4">
            <img src={qr} alt="QR 2FA" className="w-48 h-48" />
            <p className="text-xs text-slate-400 mt-2">¿No puedes escanear? Clave manual:</p>
            <code className="text-xs break-all bg-slate-100 px-2 py-1 rounded mt-1">{secreto}</code>
          </div>
        )}

        <form onSubmit={confirmar} className="space-y-4">
          <div>
            <label className="label">Código de verificación (6 dígitos)</label>
            <input
              className="input tracking-widest text-center text-lg"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="000000"
              maxLength={6}
            />
          </div>
          <button className="btn-primary w-full" disabled={cargando || codigo.length !== 6}>
            {cargando ? "Verificando..." : "Activar 2FA"}
          </button>
        </form>
      </div>
    </div>
  );
}
