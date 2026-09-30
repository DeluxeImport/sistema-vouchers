# Sistema Vouchers — Bot de Telegram (Fase 1)

Bot de Telegram que registra automáticamente los comprobantes que la gente
manda a un grupo, sin pasar por la web. Proyecto aparte del repo
`sistema-vouchers`; se conecta a él únicamente por su API (`/api/bot/*`).

No decide permisos: siempre resuelve el usuario real a partir del
`telegram_user_id` vinculado y reutiliza exactamente las mismas categorías
permitidas que la web (`categoriasDe()` del backend).

## Qué hace (Fase 1, sin OCR)

1. `/start TOKEN` — vincula la cuenta de Telegram con el token de un solo uso
   que se genera desde **Sistema Vouchers → Perfil → "Vincular Telegram"**.
2. Foto en un grupo permitido → si quien la manda está vinculado y tiene
   categorías habilitadas, el bot pregunta con botones (agrupados igual que
   la web: Compras/Servicios/Servicios Fijos abren su subcategoría; el resto
   se elige directo).
3. Al elegir la categoría, sube la foto a Sistema Vouchers y confirma con el
   `voucherId` generado.
4. Si la cuenta no está vinculada, ignora la foto en el grupo y avisa por
   privado (si el bot puede escribirle).
5. Solo quien mandó la foto (o un administrador) puede tocar los botones de
   esa subida.

Lo que **no** hace todavía (fases siguientes, no implementadas): lectura de
QR/OCR, YOLO, detección de duplicados, conciliación bancaria, exportación a
Contabilidad.

## Configuración

1. Crear el bot con [@BotFather](https://t.me/BotFather) (`/newbot`), copiar
   el token.
2. **Importante:** en BotFather, `/setprivacy` → **Disable** en este bot.
   Sin esto, el bot no puede leer fotos en grupos (solo mensajes que lo
   mencionen directamente). Esto se hace a mano, no hay forma de
   automatizarlo.
3. Agregar el bot al grupo de Telegram correspondiente y anotar su `chat_id`
   (por ejemplo reenviando un mensaje del grupo a
   [@userinfobot](https://t.me/userinfobot), o viéndolo en los logs del bot
   al recibir el primer mensaje).
4. Copiar `.env.example` a `.env` y completar:
   - `TELEGRAM_BOT_TOKEN`: el de BotFather.
   - `API_BASE_URL`: URL del backend de Sistema Vouchers (`http://localhost:3000/api`
     en desarrollo).
   - `BOT_SERVICE_TOKEN`: **debe ser idéntico** al `BOT_SERVICE_TOKEN` del
     `.env` del backend (repo `sistema-vouchers`) — es el secreto compartido
     entre ambos servicios.
   - `CHAT_IDS_PERMITIDOS`: lista de `chat_id` separados por coma. Vacío =
     acepta fotos de cualquier chat (solo para pruebas locales).

## Instalar y correr

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
python run.py
```

El bot corre por *polling* (no necesita un dominio público ni webhook). Para
producción normalmente se deja como un proceso administrado (systemd, PM2
con `pm2 start run.py --interpreter python3`, etc.) junto al backend.

## Pruebas

```bash
pip install -r requirements-dev.txt
pytest
```

Las pruebas cubren la lógica pura (etiquetas de categoría, expiración de
subidas pendientes). No hay pruebas de integración contra Telegram real ni
contra la API de Sistema Vouchers en este repo — eso se probó manualmente
contra el backend al construir los endpoints `/api/bot/*` (ver ese repo).

## Estructura

```
bot/
  config.py      # variables de entorno
  categorias.py  # espejo de frontend/src/lib/categorias.ts (mantener sincronizado a mano)
  api_client.py  # llamadas HTTP a /api/bot/*
  estado.py      # subidas pendientes en memoria (foto esperando categoría)
  teclados.py    # botones inline de categoría/subcategoría
  handlers.py    # /start, fotos, botones
  main.py        # arma la Application y arranca el polling
tests/
run.py           # punto de entrada
```

## Seguridad

- El token de servicio (`BOT_SERVICE_TOKEN`) autentica al bot frente a la
  API; no es válido para nada más (no reemplaza el login web).
- `CHAT_IDS_PERMITIDOS` es la lista blanca de grupos: fotos desde chats no
  registrados ahí se ignoran sin procesar.
- Cada botón valida que quien lo toca sea el autor de la foto o un
  administrador, antes de hacer nada.
- Los permisos por categoría los decide siempre el backend
  (`categoriasDe()`), nunca el bot.
