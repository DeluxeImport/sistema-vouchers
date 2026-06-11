# Despliegue en aaPanel — Sistema de Vouchers

Guía para publicar la aplicación en un servidor Linux con **aaPanel**, usando
**Node.js 22.22.6 (LTS)**, **PM2** como gestor de procesos y **Nginx** como
proxy inverso. La app corre como **un solo servicio** (Express sirve la API y el
frontend compilado) en `127.0.0.1:3000`.

---

## 0. Requisitos en el servidor

1. **aaPanel** instalado y accesible.
2. Plugins de aaPanel (App Store):
   - **PM2 Manager** (o **Node.js Version Manager**) → instala **Node.js 22.22.6**.
   - **Nginx** (servidor web).
3. Un **dominio** apuntando a la IP del servidor (registro A).
4. Puertos abiertos en el firewall: **80** y **443**. El **3000 NO** debe ser
   público (solo lo usa Nginx en localhost).

> Verifica la versión de Node en la terminal de aaPanel:
> `node -v` → debe decir `v22.22.6`. El repo incluye `.nvmrc` con esa versión.

---

## 1. Subir el código

Coloca el proyecto en, por ejemplo, `/www/wwwroot/sistema-vouchers`:

```bash
cd /www/wwwroot
git clone <tu-repo> sistema-vouchers      # o sube un .zip y descomprímelo
cd sistema-vouchers
```

La estructura debe quedar: `sistema-vouchers/backend`, `.../frontend`,
`ecosystem.config.cjs`, etc.

---

## 2. Crear carpeta de datos persistente

La base SQLite y las imágenes deben vivir **fuera** del código (para que un
redespliegue no las borre):

```bash
mkdir -p /www/wwwroot/sistema-vouchers/data/vouchers
```

---

## 3. Configurar variables de entorno

Crea `backend/.env` (basado en `backend/.env.example`):

```bash
cd /www/wwwroot/sistema-vouchers/backend
cp .env.example .env
# genera una clave fuerte:
openssl rand -hex 48
nano .env
```

Contenido mínimo de `backend/.env`:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=pega-aqui-la-clave-de-openssl-rand-hex-48
JWT_EXPIRATION=8h
TOTP_ISSUER=SistemaVouchers
TOTP_WINDOW=1
MAX_FILE_SIZE=10485760
DATABASE_URL=file:/www/wwwroot/sistema-vouchers/data/prod.db
STORAGE_PATH=/www/wwwroot/sistema-vouchers/data/vouchers
```

> En producción el servidor **no arranca** si `JWT_SECRET` falta o tiene menos de
> 32 caracteres (protección contra falsificación de tokens).

---

## 4. Instalar, compilar y preparar la base de datos

Desde la raíz del proyecto:

```bash
cd /www/wwwroot/sistema-vouchers
npm run install:all                       # instala raíz + backend + frontend
npm --prefix backend run prisma:generate  # cliente Prisma
npm run build                             # compila frontend (Vite) y backend (TS)
npm --prefix backend run deploy:prod      # aplica migraciones + crea el admin
```

`deploy:prod` aplica las migraciones y ejecuta el seed, que crea **solo** la
cuenta administradora:

- Usuario: `usuario1`
- Contraseña temporal: `Voucher2024_usuario1`

---

## 5. Arrancar con PM2

```bash
cd /www/wwwroot/sistema-vouchers
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # sigue la instrucción que imprime para arranque automático
```

Comprueba que responde localmente:

```bash
curl http://127.0.0.1:3000/api/health     # -> {"ok":true,"servicio":"vouchers"}
```

> También puedes gestionarlo desde el plugin **PM2 Manager** de aaPanel
> (Project dir: la raíz; Startup file: `ecosystem.config.cjs`; Node: 22.22.6).
> Recuerda: **1 instancia, modo fork** (SQLite solo admite un escritor).

---

## 6. Proxy inverso en Nginx (aaPanel)

1. En aaPanel: **Website → Add site** con tu dominio (`vouchers.tudominio.com`),
   sin base de datos (la maneja la app).
2. Entra al sitio → **Reverse Proxy → Add** :
   - Target URL: `http://127.0.0.1:3000`
   - Send Domain: `$host`
3. **Importante (subida de imágenes):** edita la configuración del sitio y añade
   dentro del `server { ... }`:
   ```nginx
   client_max_body_size 60m;
   ```
   (Sin esto, Nginx rechaza las subidas con error 413.) Tienes un ejemplo
   completo en [`deploy/nginx-sistemavouchers.conf`](deploy/nginx-sistemavouchers.conf).
4. Guarda y recarga Nginx.

---

## 7. HTTPS (SSL)

En el sitio de aaPanel → **SSL → Let's Encrypt** → emite el certificado y activa
**Force HTTPS**. aaPanel agrega el `listen 443` y la redirección 80→443.

---

## 8. Primer ingreso y puesta en marcha

1. Abre `https://vouchers.tudominio.com`.
2. Entra con `usuario1` / `Voucher2024_usuario1`.
3. El sistema obliga a **cambiar la contraseña** y **configurar 2FA** (escanea el
   QR con tu app autenticadora y **guarda los códigos de respaldo**).
4. Ve a **Administración** y crea los usuarios reales, asignando categorías y
   permisos. (El nombre de usuario no admite espacios ni acentos.)

---

## 9. Actualizaciones (redespliegue)

```bash
cd /www/wwwroot/sistema-vouchers
git pull                                  # o sube los archivos nuevos
npm run install:all
npm run build
npm --prefix backend run deploy:prod      # aplica nuevas migraciones (idempotente)
pm2 restart sistema-vouchers
```

Como la base y las imágenes están en `data/` (fuera del código), no se pierden.

---

## 10. Respaldos y mantenimiento

- **Backups**: copia periódicamente toda la carpeta `data/`
  (`prod.db` + `vouchers/`). Ejemplo con cron diario:
  ```bash
  tar czf /www/backup/vouchers-$(date +\%F).tgz /www/wwwroot/sistema-vouchers/data
  ```
- **Logs**: `pm2 logs sistema-vouchers`
- **Estado**: `pm2 status`
- **Seguridad**: mantén el `JWT_SECRET` en secreto; no publiques `backend/.env`
  (ya está en `.gitignore`). Revisa la tabla `audit_log` ante incidentes.

---

## Resumen de arquitectura

```
Internet ──HTTPS──> Nginx (aaPanel, :443)
                      │  proxy_pass
                      ▼
              Node 22 + PM2  (127.0.0.1:3000)
              Express: /api/*  +  frontend (Vite build)
                      │
                      ▼
              SQLite (data/prod.db) + imágenes (data/vouchers/)
```
