-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "debe_cambiar" BOOLEAN NOT NULL DEFAULT true,
    "totp_secret" TEXT,
    "totp_activo" BOOLEAN NOT NULL DEFAULT false,
    "backup_codes" TEXT,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" DATETIME,
    "ultimo_acceso" DATETIME,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vouchers" (
    "voucher_id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "ruta_archivo" TEXT NOT NULL,
    "tamano_bytes" INTEGER,
    "formato" TEXT,
    "fecha_carga" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_carga" TEXT,
    CONSTRAINT "vouchers_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contadores" (
    "categoria" TEXT NOT NULL PRIMARY KEY,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "detalles" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "expira_en" DATETIME NOT NULL,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE INDEX "vouchers_categoria_idx" ON "vouchers"("categoria");

-- CreateIndex
CREATE INDEX "vouchers_usuario_id_idx" ON "vouchers"("usuario_id");
