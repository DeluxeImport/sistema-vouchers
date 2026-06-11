# Auditoría de seguridad y calidad — Sistema de Vouchers

Fecha: 2026-06-11 · Alcance: backend (Node/Express/Prisma) + frontend (React/Vite).
Estado tras la auditoría: **listo para despliegue en producción** (aaPanel).

---

## 1. Seguridad

### Corregido en esta auditoría
| # | Hallazgo | Riesgo | Solución aplicada |
|---|----------|--------|-------------------|
| S1 | `JWT_SECRET` con valor por defecto (`dev-secret`) si no se define | **Alto** — falsificación de tokens/sesiones | El servidor **aborta el arranque** en producción si falta o tiene <32 caracteres (`backend/src/config.ts`). Verificado: arranque rechazado con clave débil. |
| S2 | Handler de errores devolvía `err.message` al cliente | Medio — fuga de detalles internos | En producción responde genérico `"Error interno del servidor"` (`backend/src/index.ts`). |
| S3 | Sin `trust proxy` detrás de Nginx | Medio — rate-limit y auditoría usaban IP del proxy, no la real | `app.set("trust proxy", 1)` en producción. |
| S4 | Ruta al frontend dependía del `cwd` | Bajo — fallo de arranque con PM2 | Se resuelve respecto al archivo compilado (`import.meta.url`). |
| S5 | Riesgo de subir `.env`/BD/imágenes al repo | Medio — exposición de secretos | `.gitignore` añadido (excluye `.env`, `*.db`, `storage/`, `dist/`). |

### Controles ya presentes (verificados, correctos)
- **Hashing** de contraseñas con bcrypt (cost 12). Validación de contraseña fuerte.
- **2FA TOTP** obligatorio (speakeasy) + códigos de respaldo de un solo uso (SHA-256).
- **Bloqueo de cuenta**: 5 intentos fallidos → 15 min. Reset de intentos al entrar.
- **Rate limiting**: login 10/min/IP, API global 200/min/IP.
- **Cabeceras de seguridad** (Helmet): CSP estricta, HSTS, `X-Frame-Options`,
  `X-Content-Type-Options: nosniff`. Verificadas en la respuesta HTTP.
- **RBAC y aislamiento de datos**: cada usuario solo ve lo suyo y sus categorías
  permitidas; endpoints de administración protegidos con `requireAdmin`;
  acceso a imágenes/descarga validado por dueño+categoría. `requireAuth` recarga
  el usuario en cada petición (cambios de permiso aplican al instante).
- **Inyección SQL**: Prisma parametriza todas las consultas.
- **Subida de archivos**: validación de MIME, límite de tamaño (10 MB) y de
  cantidad (5), nombres generados por el servidor (sin path traversal),
  recompresión con sharp para imágenes grandes.
- **Auditoría**: tabla `audit_log` registra login, cambios, altas/bajas, etc.

### Recomendaciones (opcionales, no bloqueantes)
- **R1**: validar *magic bytes* del archivo (no solo el MIME) para rechazar
  ficheros con extensión/MIME falsificados (<5 MB hoy se guardan sin reprocesar).
- **R2**: backups automáticos de `data/` (BD + imágenes) — incluido en la guía.
- **R3**: si se requiere revocación inmediata de sesiones, invalidar el token en
  `logout` (hoy expira por tiempo, 8 h).
- **R4**: ante mucho tráfico, considerar Postgres en lugar de SQLite (1 escritor).

---

## 2. Calidad de código

| Estado | Punto |
|--------|-------|
| ✅ | **TypeScript estricto** (`strict: true`) en backend y frontend; compila sin errores ni warnings de tipos. |
| ✅ | **Bundle del frontend dividido** en chunks (`react`, `charts`, app) — se eliminó el aviso de "chunk > 500 kB" y mejora el cacheo. |
| ✅ | **0 vulnerabilidades** en `npm audit` (backend producción y frontend). |
| ✅ | Separación de responsabilidades: `config`, `middleware`, `services`, `routes`, `utils`. |
| ✅ | Arranque de producción separado del runtime: `deploy:prod` (migraciones+seed una vez) vs `start` (solo `node dist`), evitando re-seed en cada reinicio de PM2. |
| ✅ | Mensajes de validación claros (zod) y propagados al frontend. |
| ℹ️ | Centinela `categoria: "__none__"` para "no devolver nada" cuando se pide una categoría no permitida: funcional y seguro; se mantiene por simplicidad. |

---

## 3. Compatibilidad de entorno

- **Node.js fijado a 22.22.6 (LTS)** para el servidor: `.nvmrc`, `engines`
  (`>=22.0.0`) en raíz/backend/frontend, e imagen Docker `node:22-slim`.
- Verificado el build y la ejecución completos (frontend + backend + arranque
  en modo producción) en este entorno.

---

## 4. Veredicto

La aplicación es **apta para producción**. Los hallazgos de severidad media/alta
fueron corregidos y verificados. Las recomendaciones restantes son mejoras
incrementales que no bloquean el despliegue. Seguir [`DEPLOY_AAPANEL.md`](DEPLOY_AAPANEL.md).
