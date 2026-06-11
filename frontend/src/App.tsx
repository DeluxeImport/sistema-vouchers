import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./store/auth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import CambiarPasswordPage from "./pages/CambiarPasswordPage";
import Setup2FAPage from "./pages/Setup2FAPage";
import DashboardPage from "./pages/DashboardPage";
import SubirVoucherPage from "./pages/SubirVoucherPage";
import GaleriaPage from "./pages/GaleriaPage";
import PerfilPage from "./pages/PerfilPage";
import AdminPage from "./pages/AdminPage";

// Redirige al primer modulo permitido para el usuario.
function Inicio() {
  const u = useAuth((s) => s.usuario);
  if (u?.puedeVerDashboard) return <DashboardPage />;
  if (u?.puedeVerGaleria) return <Navigate to="/galeria" replace />;
  if (u?.puedeSubir) return <Navigate to="/subir" replace />;
  if (u?.esAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/perfil" replace />;
}

// Bloquea el acceso a una ruta si el usuario no tiene el permiso requerido.
function Permitido({ cond, children }: { cond: boolean | undefined; children: React.ReactNode }) {
  if (!cond) return <Navigate to="/perfil" replace />;
  return <>{children}</>;
}

export default function App() {
  const { cargarPerfil, cargado, usuario } = useAuth();

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  if (!cargado) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cambiar-password" element={<ProtectedRoute permitirOnboarding><CambiarPasswordPage /></ProtectedRoute>} />
      <Route path="/configurar-2fa" element={<ProtectedRoute permitirOnboarding><Setup2FAPage /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Inicio />} />
        <Route path="/subir" element={<Permitido cond={usuario?.puedeSubir}><SubirVoucherPage /></Permitido>} />
        <Route path="/galeria" element={<Permitido cond={usuario?.puedeVerGaleria}><GaleriaPage /></Permitido>} />
        <Route path="/admin" element={<Permitido cond={usuario?.esAdmin}><AdminPage /></Permitido>} />
        <Route path="/perfil" element={<PerfilPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
