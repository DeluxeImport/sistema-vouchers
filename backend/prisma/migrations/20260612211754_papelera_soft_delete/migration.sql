-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN "eliminado_en" DATETIME;

-- CreateIndex
CREATE INDEX "vouchers_eliminado_en_idx" ON "vouchers"("eliminado_en");
