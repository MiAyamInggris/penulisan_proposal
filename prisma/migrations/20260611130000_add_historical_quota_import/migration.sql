-- CreateEnum
CREATE TYPE "HistoricalImportSource" AS ENUM ('KAPRODI_FULL', 'KETUA_KK_TA_PAST');

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN "historicalImportSource" "HistoricalImportSource";
ALTER TABLE "Class" ADD COLUMN "isSystemClass" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing historical-import proposals were all created via the Kaprodi full import
UPDATE "Proposal" SET "historicalImportSource" = 'KAPRODI_FULL' WHERE "isHistoricalImport" = true;
