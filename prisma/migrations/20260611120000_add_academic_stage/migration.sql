-- CreateEnum
CREATE TYPE "AcademicStage" AS ENUM ('PENULISAN_PROPOSAL', 'TUGAS_AKHIR_2');

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "academicStage" "AcademicStage" NOT NULL DEFAULT 'PENULISAN_PROPOSAL';

-- Backfill: historical imports and already-passed proposals are TA2 from day one
UPDATE "Proposal" p
SET "academicStage" = 'TUGAS_AKHIR_2'
WHERE p."isHistoricalImport" = true
   OR EXISTS (
     SELECT 1 FROM "FinalGrade" fg WHERE fg."proposalId" = p.id AND fg.passed = true
   );
