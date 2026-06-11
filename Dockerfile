# ============================================================
#  Sistema de Vouchers - imagen unica para Railway
#  Compila el frontend (Vite) y el backend (TS) y los sirve
#  desde un solo servicio Express.
# ============================================================
FROM node:22-slim

# openssl es requerido por Prisma en Debian slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Dependencias (cache de capas)
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm --prefix backend ci && npm --prefix frontend ci

# 2) Codigo fuente
COPY backend ./backend
COPY frontend ./frontend

# 3) Build: cliente Prisma + frontend + backend
RUN npm --prefix backend run prisma:generate \
 && npm --prefix frontend run build \
 && npm --prefix backend run build

ENV NODE_ENV=production
# Railway inyecta PORT automaticamente; el server lo lee desde config.ts
EXPOSE 3000

# Aplica migraciones, asegura usuarios (idempotente) y arranca
CMD ["npm", "--prefix", "backend", "run", "start:prod"]
