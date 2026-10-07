-- ============================================================
-- Sistema de Vouchers - nueva estructura contable de categorias
-- (vouchers y documentos comparten las mismas categorias).
--
-- Ejecutar UNA VEZ en produccion (TiDB Cloud SQL Editor, Workbench o DBeaver)
-- ANTES de desplegar el codigo nuevo, y con un respaldo previo de la base.
-- No borra ni modifica vouchers: solo agrega la columna tipo_documento y
-- marca los documentos historicos (categoria NOTA / FACTURA / BOLETA).
--
-- IMPORTANTE: usa el mismo nombre de base que aparece en DATABASE_URL del
-- backend/.env del servidor (.../NOMBRE?sslaccept=...). Si no es "vouchers",
-- reemplaza `vouchers`.`vouchers` por `NOMBRE`.`vouchers` en las 3 sentencias.
--
-- Si el ALTER responde "Duplicate column name 'tipo_documento'", el script ya
-- se habia ejecutado: no hace falta repetirlo.
--
-- Comprobacion previa (anota el resultado para compararlo despues):
--   SELECT COUNT(*) FROM `vouchers`.`vouchers`;
-- ============================================================

-- 1) Tipo de documento: NULL = voucher; NOTA / FACTURA / BOLETA = documento.
ALTER TABLE `vouchers`.`vouchers` ADD COLUMN `tipo_documento` VARCHAR(191) NULL;
CREATE INDEX `vouchers_tipo_documento_idx` ON `vouchers`.`vouchers`(`tipo_documento`);

-- 2) Los documentos subidos antes de este cambio quedan como documentos de su
--    tipo (su categoria sigue siendo NOTA / FACTURA / BOLETA hasta que el admin
--    los reclasifique a una categoria contable desde la galeria).
UPDATE `vouchers`.`vouchers`
SET `tipo_documento` = `categoria`
WHERE `categoria` IN ('NOTA', 'FACTURA', 'BOLETA');

-- Los contadores de las categorias nuevas los crea el seed al desplegar
-- (npm --prefix backend run deploy:prod).
