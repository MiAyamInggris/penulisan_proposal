-- AlterTable: add isKetua and maxBimbinganQuota to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isKetua" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxBimbinganQuota" INTEGER NOT NULL DEFAULT 5;
