# Mantenimiento y actualización — Sistema de Vouchers

Guía operativa de "día 2": cómo subir cambios nuevos al servidor y cómo
verificar que el sistema sigue sano. Para la instalación desde cero, ver
[`DEPLOY_AAPANEL.md`](DEPLOY_AAPANEL.md).

Servidor de producción: VPS aaPanel `161.132.68.126`
(`sv-h3EKV6STqPJBwMLk0mDQ.cloud.elastika.pe`), proceso PM2 `sistema-vouchers`,
en `/www/wwwroot/sistema-vouchers`.

---

## 1. Flujo para subir un cambio nuevo

1. Desarrollar en una rama (`feature/...`), abrir Pull Request en GitHub,
   revisar y mergear a `main`.
2. En el servidor (terminal de aaPanel o SSH con **usuario con llave, nunca
   root con contraseña** — ver [sección 5](#5-seguridad)):

   ```bash
   cd /www/wwwroot/sistema-vouchers
   git pull
   npm run install:all
   npm run build
   npm --prefix backend run deploy:prod   # aplica migraciones (idempotente)
   pm2 restart sistema-vouchers
   ```

3. Verificar con el checklist de la sección 2. No des el despliegue por
   bueno solo porque el comando no tiró error — confírmalo con el health
   check.

---

## 2. Checklist de verificación post-despliegue

```bash
pm2 status
curl -s http://127.0.0.1:3000/api/health
pm2 logs sistema-vouchers --lines 20 --nostream
```

Qué esperar:

| Comando | Resultado esperado |
|---|---|
| `pm2 status` | fila `sistema-vouchers` en **`online`**, `uptime` de segundos/minutos recién hecho el restart (no en loop) |
| `curl .../api/health` | `{"ok":true,"servicio":"vouchers"}` |
| `pm2 logs` | sin excepciones ni stack traces nuevos (el WARNING de CPU de la sección 3 es normal, ignóralo) |

Si `pm2 logs ... --lines N --nostream` te da `error: unknown option`, es que
la terminal cortó el flag al pegar (p. ej. `--err` quedó en `--er`). Vuelve a
pegar el comando completo, no es un error de la app.

### Señal real de problema

El contador **↺ (restarts)** de `pm2 status` es acumulado histórico —sube
+1 en cada `pm2 restart` que hagas tú mismo, así que un número alto por sí
solo no significa nada. Lo que sí es señal de alarma: `uptime` reiniciándose
a **segundos** una y otra vez sin que tú hayas tocado nada (loop de crash).
Ahí sí revisar `pm2 logs sistema-vouchers --err --lines 50 --nostream`.

---

## 3. Warning conocido (inofensivo)

En el log de errores de PM2 aparece esto al arrancar:

```
WARNING: CPU supports 0x6000000000004000, software requires 0x4000000000005000
```

Es un aviso de compatibilidad de set de instrucciones de alguna dependencia
nativa (probablemente el motor de Prisma), producto del hipervisor del VPS
exponiendo un CPU virtual distinto al esperado por el binario. **Confirmado
inofensivo** (2026-07-27): el log de errores no tiene nada más aparte de
esas líneas, el health check responde bien y no hay reinicios en loop. No
requiere acción.

---

## 4. Logs y backups

- Salida normal: `/root/.pm2/logs/sistema-vouchers-out-0.log`
- Errores: `/root/.pm2/logs/sistema-vouchers-error-0.log`
- Ver en vivo: `pm2 logs sistema-vouchers`
- Estado: `pm2 status` / `pm2 describe sistema-vouchers`
- La app también loguea solita el borrado automático de la papelera
  ("Papelera: N voucher(s) eliminados definitivamente.") — es el cron
  interno de `DIAS_PAPELERA` (15 días), no algo externo.

**Backups**: la base SQLite y las imágenes/PDF viven en
`/www/wwwroot/sistema-vouchers/data/` (fuera del código, así un
`git pull` nunca las toca). Respaldar periódicamente:

```bash
tar czf /www/backup/vouchers-$(date +%F).tgz /www/wwwroot/sistema-vouchers/data
```

---

## 5. Seguridad

Este VPS sufrió una intrusión por **SSH root con contraseña** (fuerza
bruta) el 2026-07-25, limpiada el 2026-07-27. Reglas fijas desde entonces:

- **Nunca** reactivar el login de root por contraseña — el SSH está en
  `prohibit-password` (solo llave) a propósito.
- Desplegar con un usuario no-root con llave SSH cuando sea posible.
- Revisar de vez en cuando `audit_log` de la app (tabla en la BD, guarda
  logins, subidas, ediciones y borrados) y `/var/log/auth.log` del server
  por intentos de `Accepted password for root`.
- No subir `backend/.env` a git (ya está en `.gitignore`) — ahí vive el
  `JWT_SECRET`.

---

## 6. Nota para el que agregue una categoría de documento nueva

Las categorías con tarjeta dedicada de "solo PDF" (Factura, Boleta) están
declaradas en **dos lugares que no se sincronizan solos**:

- Backend: `CATEGORIAS_DOCUMENTO` en `backend/src/config.ts` (qué
  categorías existen).
- Frontend: `CATEGORIAS_PDF` en `frontend/src/pages/SubirVoucherPage.tsx`
  (cuáles de esas categorías tienen la tarjeta de subida de PDF sin foto).

Si se agrega una categoría nueva pensada para recibir PDF, hay que
añadirla en **ambos** archivos. La tarjeta genérica "Subir Documento" solo
acepta imágenes (su dropzone no incluye `application/pdf`), así que si se
olvida el segundo paso, esa categoría se queda sin ninguna forma de subir
PDF desde la interfaz.

---

## 7. Cuenta admin por defecto

- Usuario: `usuario1`
- La contraseña temporal y el 2FA se configuran en el primer login (ver
  [`DEPLOY_AAPANEL.md`](DEPLOY_AAPANEL.md), sección 8). Solo el admin
  (`esAdmin`) puede editar fecha/nota de un voucher ya subido — el resto
  de usuarios solo ve/sube/borra.
