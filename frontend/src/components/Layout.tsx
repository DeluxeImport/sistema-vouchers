import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { CATEGORIAS_LEGADO, TIPOS_DOCUMENTO, etiquetaCategoria, gruposPermitidos } from "../lib/categorias";
import { usePermisosSubida } from "../pages/SubirVoucherPage";

// Item de un submenu desplegado (Subir / Galería).
function ItemSubmenu({ to, label, activo, color }: { to: string; label: string; activo: boolean; color?: string }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs transition ${
        activo ? "bg-acento text-white" : "text-slate-300 hover:bg-white/10"
      }`}
    >
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TituloSubmenu({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pt-2 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</div>;
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hayVoucher, hayDocumento } = usePermisosSubida();

  // Cada item se muestra solo si el usuario tiene el permiso correspondiente.
  const navItems = [
    { to: "/", label: "Dashboard", icon: "▦", ver: !!usuario?.puedeVerDashboard },
    { to: "/subir", label: "Subir", icon: "＋", ver: !!usuario?.puedeSubir },
    { to: "/galeria", label: "Galería", icon: "▤", ver: !!usuario?.puedeVerGaleria },
    { to: "/admin", label: "Administración", icon: "⚙", ver: !!usuario?.esAdmin },
    { to: "/perfil", label: "Perfil", icon: "☺", ver: true },
  ].filter((it) => it.ver);

  // "Subir" es un desplegable: General (todo junto), Subir Voucher y Subir
  // Documento. Se abre solo al estar en /subir* y se puede abrir/cerrar a mano.
  const enSubir = location.pathname.startsWith("/subir");
  const [subirAbierto, setSubirAbierto] = useState(enSubir);
  useEffect(() => {
    if (enSubir) setSubirAbierto(true);
  }, [enSubir]);

  // Submenu de Galería: por tipo (vouchers / documentos) y por categoria principal.
  const esAdmin = !!usuario?.esAdmin;
  const permitidas = new Set(usuario?.categorias ?? []);
  const puedeVer = (c: string) => esAdmin || permitidas.has(c);
  const gruposGaleria = gruposPermitidos(puedeVer);
  const tiposGaleria = TIPOS_DOCUMENTO.filter(puedeVer);
  const hayLegado = [...CATEGORIAS_LEGADO, ...TIPOS_DOCUMENTO].some(puedeVer);
  const galeriaAbierta = !!usuario?.puedeVerGaleria && location.pathname.startsWith("/galeria");
  const params = new URLSearchParams(location.search);
  const tipoActivo = params.get("tipo");
  const grupoActivo = params.get("grupo");
  const sinFiltroGaleria = !tipoActivo && !grupoActivo && !params.get("categoria");

  const salir = async () => {
    await logout();
    navigate("/login");
  };

  const claseItem = (activo: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
      activo ? "bg-acento text-white" : "text-slate-300 hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-primario text-white">
        <div className="px-6 py-5 text-xl font-bold border-b border-white/10">
          Vouchers
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((it) => (
            <div key={it.to}>
              {it.to === "/subir" ? (
                <button
                  type="button"
                  onClick={() => setSubirAbierto((v) => !v)}
                  className={claseItem(enSubir)}
                  aria-expanded={subirAbierto}
                >
                  <span className="text-lg">{it.icon}</span>
                  <span className="flex-1 text-left">{it.label}</span>
                  <span className={`text-xs transition-transform ${subirAbierto ? "rotate-90" : ""}`}>▸</span>
                </button>
              ) : (
                <NavLink to={it.to} end={it.to === "/"} className={({ isActive }) => claseItem(isActive)}>
                  <span className="text-lg">{it.icon}</span>
                  {it.label}
                </NavLink>
              )}

              {it.to === "/subir" && subirAbierto && (
                <div className="mt-1 mb-2 ml-5 space-y-0.5 border-l border-white/10 pl-3">
                  <ItemSubmenu to="/subir" label="General" activo={location.pathname === "/subir"} />
                  {hayVoucher && (
                    <ItemSubmenu to="/subir/voucher" label="Subir Voucher" activo={location.pathname === "/subir/voucher"} />
                  )}
                  {hayDocumento && (
                    <ItemSubmenu
                      to="/subir/documento"
                      label="Subir Documento"
                      activo={location.pathname === "/subir/documento"}
                    />
                  )}
                </div>
              )}

              {it.to === "/galeria" && galeriaAbierta && (
                <div className="mt-1 mb-2 ml-5 space-y-0.5 border-l border-white/10 pl-3">
                  <ItemSubmenu to="/galeria" label="Todas" activo={sinFiltroGaleria} />
                  <ItemSubmenu to="/galeria?tipo=VOUCHER" label="Vouchers" activo={tipoActivo === "VOUCHER" && !grupoActivo} />
                  {tiposGaleria.length > 0 && (
                    <>
                      <ItemSubmenu
                        to="/galeria?tipo=DOCUMENTO"
                        label="Documentos"
                        activo={tipoActivo === "DOCUMENTO" && !grupoActivo}
                      />
                      <div className="ml-3 space-y-0.5">
                        {tiposGaleria.map((t) => (
                          <ItemSubmenu
                            key={t}
                            to={`/galeria?tipo=${t}`}
                            label={etiquetaCategoria(t)}
                            activo={tipoActivo === t && !grupoActivo}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {gruposGaleria.length > 0 && <TituloSubmenu>Por categoría</TituloSubmenu>}
                  {gruposGaleria.map((g) => (
                    <ItemSubmenu
                      key={g.id}
                      to={`/galeria?grupo=${g.id}`}
                      label={g.label}
                      color={g.color}
                      activo={grupoActivo === g.id && !tipoActivo}
                    />
                  ))}
                  {hayLegado && (
                    <ItemSubmenu
                      to="/galeria?grupo=LEGADO"
                      label="Categorías anteriores"
                      color="#94A3B8"
                      activo={grupoActivo === "LEGADO" && !tipoActivo}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-sm text-slate-300 mb-2">{usuario?.nombre}</div>
          <button onClick={salir} className="w-full btn bg-white/10 text-white hover:bg-white/20 text-sm">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="md:hidden flex items-center justify-between bg-primario text-white px-4 py-3">
        <span className="font-bold">Vouchers</span>
        <button onClick={salir} className="text-sm underline">Salir</button>
      </header>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom tabs mobile (en /subir las pestañas Todo/Voucher/Documento van dentro de la pagina) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around py-2 z-10">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs px-2 ${isActive ? "text-acento" : "text-slate-500"}`
            }
          >
            <span className="text-lg">{it.icon}</span>
            {it.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
