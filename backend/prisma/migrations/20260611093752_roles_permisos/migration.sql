-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'USUARIO',
    "categorias_permitidas" TEXT,
    "puede_subir" BOOLEAN NOT NULL DEFAULT true,
    "puede_ver_galeria" BOOLEAN NOT NULL DEFAULT true,
    "puede_ver_dashboard" BOOLEAN NOT NULL DEFAULT true,
    "puede_descargar" BOOLEAN NOT NULL DEFAULT true,
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
INSERT INTO "new_usuarios" ("actualizado", "backup_codes", "bloqueado_hasta", "creado_en", "debe_cambiar", "id", "intentos_fallidos", "nombre", "password_hash", "totp_activo", "totp_secret", "ultimo_acceso", "username") SELECT "actualizado", "backup_codes", "bloqueado_hasta", "creado_en", "debe_cambiar", "id", "intentos_fallidos", "nombre", "password_hash", "totp_activo", "totp_secret", "ultimo_acceso", "username" FROM "usuarios";
DROP TABLE "usuarios";
ALTER TABLE "new_usuarios" RENAME TO "usuarios";
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
