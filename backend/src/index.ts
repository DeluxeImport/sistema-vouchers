import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import voucherRoutes from "./routes/vouchers.js";
import userRoutes from "./routes/users.js";
import { limpiarPapelera } from "./services/voucherService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Detras de un proxy inverso (Nginx en aaPanel): confiar en 1 salto para que
// el rate-limit y la IP de auditoria usen la IP real del cliente (X-Forwarded-For).
if (config.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

// Headers de seguridad (CSP, X-Frame-Options, X-Content-Type-Options, HSTS...)
// CSP permite imagenes data:/blob: (QR 2FA y previews) y estilos inline (Recharts/React).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
      },
    },
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, servicio: "vouchers" }));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/users", userRoutes);

// En produccion, el backend sirve el frontend ya compilado (SPA de Vite).
// Asi todo corre en un solo servicio (un solo puerto detras de Nginx).
// La ruta se resuelve respecto al archivo compilado (backend/dist), no respecto
// al cwd, para que funcione con PM2 o cualquier directorio de arranque.
if (config.nodeEnv === "production") {
  const dist = path.resolve(__dirname, "..", "..", "frontend", "dist");
  app.use(express.static(dist));
  // Fallback SPA: cualquier ruta que no sea /api devuelve index.html.
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Manejo de errores (incluye limites de multer)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Archivo demasiado grande (max 10 MB)" });
  }
  if (err?.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Maximo 5 imagenes por carga" });
  }
  console.error(err);
  // No exponer detalles internos al cliente en produccion.
  const mensaje = config.nodeEnv === "production" ? "Error interno del servidor" : err?.message ?? "Error interno";
  return res.status(500).json({ error: mensaje });
});

app.listen(config.port, () => {
  console.log(`Backend escuchando en http://localhost:${config.port}`);
});

// Limpieza de la papelera: borra definitivamente lo que lleva +15 dias.
// Se ejecuta al arrancar y cada 6 horas.
async function tareaLimpieza() {
  try {
    const n = await limpiarPapelera();
    if (n > 0) console.log(`Papelera: ${n} voucher(s) eliminados definitivamente.`);
  } catch (e) {
    console.error("Error limpiando la papelera:", e);
  }
}
tareaLimpieza();
setInterval(tareaLimpieza, 6 * 60 * 60 * 1000);
