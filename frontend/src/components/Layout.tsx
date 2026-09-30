import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { GRUPOS_VOUCHER, CATEGORIAS_SUELTAS, CATEGORIAS_DOCUMENTO, LABEL_CATEGORIA, type Categoria } from "../lib/categorias";

// Item de una (sub)categoria dentro del submenu desplegado de Galería.
function ItemCategoria({ to, label, activo }: { to: string; label: string; activo: boolean }) {
  return (
    <Link
      to={to}
      className={`block rounded-md px-2 py-1 text-xs transition ${
        activo ? "bg-acento text-white" : "text-slate-300 hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Cada item se muestra solo si el usuario tiene el permiso correspondiente.
  const navItems = [
    { to: "/", label: "Dashboard", icon: "▦", ver: !!usuario?.puedeVerDashboard },
    { to: "/subir", label: "Subir", icon: "＋", ver: !!usuario?.puedeSubir },
    { to: "/galeria", label: "Galería", icon: "▤", ver: !!usuario?.puedeVerGaleria },
    { to: "/admin", label: "Administración", icon: "⚙", ver: !!usuario?.esAdmin },
    { to: "/perfil", label: "Perfil", icon: "☺", ver: true },
  ].filter((it) => it.ver);

  // Submenu de Galería: se despliega al entrar a /galeria, con Compras,
  // Servicios y Servicios Fijos mostrando sus subcategorias debajo, y el
  // resto (Recompras, Alquiler, Nota, Factura, Boleta) como enlaces directos.
  const esAdmin = !!usuario?.esAdmin;
  const permitidas = new Set(usuario?.categorias ?? []);
  const puedeVer = (c: Categoria) => esAdmin || permitidas.has(c);
  const gruposGaleria = GRUPOS_VOUCHER.map((g) => ({
    ...g,
    subcategorias: g.subcategorias.filter(puedeVer),
  })).filter((g) => g.subcategorias.length > 0);
  const sueltasGaleria = [...CATEGORIAS_SUELTAS, ...CATEGORIAS_DOCUMENTO].filter(puedeVer);
  const galeriaAbierta = !!usuario?.puedeVerGaleria && location.pathname.startsWith("/galeria");
  const categoriaActiva = new URLSearchParams(location.search).get("categoria");

  const salir = async () => {
    await logout();
    navigate("/login");
  };

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
              <NavLink
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
                    isActive ? "bg-acento text-white" : "text-slate-300 hover:bg-white/10"
                  }`
                }
              >
                <span className="text-lg">{it.icon}</span>
                {it.label}
              </NavLink>

              {it.to === "/galeria" && galeriaAbierta && (
                <div className="mt-1 mb-2 ml-5 space-y-0.5 border-l border-white/10 pl-3">
                  <ItemCategoria to="/galeria" label="Todas" activo={!categoriaActiva} />
                  {gruposGaleria.map((g) => (
                    <div key={g.id} className="pt-1.5">
                      <div className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {g.label}
                      </div>
                      {g.subcategorias.map((c) => (
                        <ItemCategoria
                          key={c}
                          to={`/galeria?categoria=${c}`}
                          label={LABEL_CATEGORIA[c]}
                          activo={categoriaActiva === c}
                        />
                      ))}
                    </div>
                  ))}
                  {sueltasGaleria.length > 0 && (
                    <div className="pt-1.5 space-y-0.5">
                      {sueltasGaleria.map((c) => (
                        <ItemCategoria
                          key={c}
                          to={`/galeria?categoria=${c}`}
                          label={LABEL_CATEGORIA[c]}
                          activo={categoriaActiva === c}
                        />
                      ))}
                    </div>
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

      {/* Bottom tabs mobile */}
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
