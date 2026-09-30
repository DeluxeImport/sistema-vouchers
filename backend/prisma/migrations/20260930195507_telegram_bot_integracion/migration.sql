-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "telegram_user_id" TEXT;

-- CreateTable
CREATE TABLE "tokens_vinculacion" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "expira_en" DATETIME NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tokens_vinculacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "grupos_telegram" (
    "chat_id" TEXT NOT NULL PRIMARY KEY,
    "area_o_centro_costo" TEXT NOT NULL,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_telegram_user_id_key" ON "usuarios"("telegram_user_id");
