import { Navigate } from "react-router-dom";
import { useAuth } from "../store/auth";

interface Props {
  children: React.ReactNode;
  permitirOnboarding?: boolean;
}

// Aplica el flujo obligatorio: cambiar contrasena -> configurar 2FA -> acceso.
export default function ProtectedRoute({ children, permitirOnboarding }: Props) {
  const { token, debeCambiar, totpActivo } = useAuth();

  if (!token) return <Navigate to="/login" replace />;

  if (!permitirOnboarding) {
    if (debeCambiar) return <Navigate to="/cambiar-password" replace />;
    if (!totpActivo) return <Navigate to="/configurar-2fa" replace />;
  }

  return <>{children}</>;
}
