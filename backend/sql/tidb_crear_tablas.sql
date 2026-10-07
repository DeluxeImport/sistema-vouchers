-- ============================================================
-- Sistema de Vouchers - creacion de tablas en TiDB (compatible MySQL)
-- Ejecutar a mano (TiDB Cloud SQL Editor, MySQL Workbench o DBeaver)
-- sobre una base vacia. Generado desde prisma/schema.prisma.
-- Cada tabla va con el nombre de la base delante: no depende de USE.
-- En TiDB Cloud SQL Editor: seleccionar TODO (Ctrl+A) y luego Ctrl+Enter.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `vouchers`;

-- CreateTable
CREATE TABLE `vouchers`.`usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `rol` VARCHAR(191) NOT NULL DEFAULT 'USUARIO',
    `categorias_permitidas` TEXT NULL,
    `puede_subir` BOOLEAN NOT NULL DEFAULT true,
    `puede_ver_galeria` BOOLEAN NOT NULL DEFAULT true,
    `puede_ver_dashboard` BOOLEAN NOT NULL DEFAULT true,
    `puede_descargar` BOOLEAN NOT NULL DEFAULT true,
    `debe_cambiar` BOOLEAN NOT NULL DEFAULT true,
    `totp_secret` VARCHAR(191) NULL,
    `totp_activo` BOOLEAN NOT NULL DEFAULT false,
    `backup_codes` TEXT NULL,
    `intentos_fallidos` INTEGER NOT NULL DEFAULT 0,
    `bloqueado_hasta` DATETIME(3) NULL,
    `ultimo_acceso` DATETIME(3) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,
    `telegram_user_id` VARCHAR(191) NULL,

    UNIQUE INDEX `usuarios_username_key`(`username`),
    UNIQUE INDEX `usuarios_telegram_user_id_key`(`telegram_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers`.`vouchers` (
    `voucher_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `tipo_documento` VARCHAR(191) NULL,
    `nombre_archivo` VARCHAR(191) NOT NULL,
    `ruta_archivo` VARCHAR(500) NOT NULL,
    `tamano_bytes` INTEGER NULL,
    `formato` VARCHAR(191) NULL,
    `fecha_carga` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_voucher` DATETIME(3) NULL,
    `descripcion` TEXT NULL,
    `eliminado_en` DATETIME(3) NULL,
    `ip_carga` VARCHAR(191) NULL,

    INDEX `vouchers_categoria_idx`(`categoria`),
    INDEX `vouchers_tipo_documento_idx`(`tipo_documento`),
    INDEX `vouchers_usuario_id_idx`(`usuario_id`),
    INDEX `vouchers_eliminado_en_idx`(`eliminado_en`),
    PRIMARY KEY (`voucher_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers`.`contadores` (
    `categoria` VARCHAR(191) NOT NULL,
    `ultimo_numero` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers`.`audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` VARCHAR(191) NULL,
    `accion` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `detalles` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers`.`sesiones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers`.`tokens_vinculacion` (
    `token` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers`.`grupos_telegram` (
    `chat_id` VARCHAR(191) NOT NULL,
    `area_o_centro_costo` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`chat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vouchers`.`vouchers` ADD CONSTRAINT `vouchers_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `vouchers`.`usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vouchers`.`audit_log` ADD CONSTRAINT `audit_log_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `vouchers`.`usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vouchers`.`sesiones` ADD CONSTRAINT `sesiones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `vouchers`.`usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vouchers`.`tokens_vinculacion` ADD CONSTRAINT `tokens_vinculacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `vouchers`.`usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

