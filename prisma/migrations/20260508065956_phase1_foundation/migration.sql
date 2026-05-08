-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOSEN', 'MAHASISWA');

-- CreateEnum
CREATE TYPE "ProdiCode" AS ENUM ('RPL', 'IF', 'DS', 'SI');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('ENROLLED', 'PROPOSAL_UPLOADED', 'ASSIGNED', 'BIMBINGAN', 'DE_READY', 'DE_COMPLETED', 'REVISION_UPLOADED', 'SEMINAR_REGISTERED', 'SEMINAR_COMPLETED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EprtStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "SeminarStatus" AS ENUM ('REGISTERED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SEMINAR_REGISTRATION', 'EPRT_VERIFIED', 'DE_SCORED', 'ASSIGNMENT_MADE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "identifier" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" "ProdiCode" NOT NULL,
    "literatureReviewPct" DOUBLE PRECISION NOT NULL,
    "bimbinganPct" DOUBLE PRECISION NOT NULL,
    "deskEvaluationPct" DOUBLE PRECISION NOT NULL,
    "presentasiPct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "dosenKelasId" TEXT NOT NULL,
    "deDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "titleEn" TEXT,
    "topicArea" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'ENROLLED',
    "proposalUrl" TEXT,
    "proposalUploadedAt" TIMESTAMP(3),
    "revisionUrl" TEXT,
    "presentationUrl" TEXT,
    "revisionUploadedAt" TIMESTAMP(3),
    "supervisor1RequestedId" TEXT,
    "supervisor2RequestedId" TEXT,
    "supervisor1AssignedId" TEXT,
    "supervisor2AssignedId" TEXT,
    "deskEvaluatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BimbinganSession" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topicsDiscussed" TEXT NOT NULL,
    "nextPlan" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BimbinganSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EprtRecord" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "eprtDate" TIMESTAMP(3) NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "status" "EprtStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EprtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NilaiBimbingan" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "pembimbingId" TEXT NOT NULL,
    "pemilihanTema" DOUBLE PRECISION NOT NULL,
    "researchQuestion" DOUBLE PRECISION NOT NULL,
    "studiLiteratur1" DOUBLE PRECISION NOT NULL,
    "studiLiteratur2" DOUBLE PRECISION NOT NULL,
    "rencanaImplementasi" DOUBLE PRECISION NOT NULL,
    "kemandirian" DOUBLE PRECISION NOT NULL,
    "prosesBimbingan" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NilaiBimbingan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeskEvaluation" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "latarBelakang" DOUBLE PRECISION NOT NULL,
    "formulasiMasalah" DOUBLE PRECISION NOT NULL,
    "teoriPendukung" DOUBLE PRECISION NOT NULL,
    "ideMetode" DOUBLE PRECISION NOT NULL,
    "catatanReviewer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeskEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NilaiLiteratureReview" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "pembimbingId" TEXT NOT NULL,
    "kualitasPustaka" DOUBLE PRECISION NOT NULL,
    "kontenRumusan" DOUBLE PRECISION NOT NULL,
    "analisisTujuan" DOUBLE PRECISION NOT NULL,
    "kelengkapanKajian" DOUBLE PRECISION NOT NULL,
    "kelebihanKekurangan" DOUBLE PRECISION NOT NULL,
    "relasiTeori" DOUBLE PRECISION NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NilaiLiteratureReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seminar" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDate" TIMESTAMP(3),
    "location" TEXT,
    "status" "SeminarStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seminar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NilaiPresentasi" (
    "id" TEXT NOT NULL,
    "seminarId" TEXT NOT NULL,
    "pembimbingId" TEXT NOT NULL,
    "latarBelakangScore" DOUBLE PRECISION NOT NULL,
    "teoriPendukungScore" DOUBLE PRECISION NOT NULL,
    "toolsPemodelanScore" DOUBLE PRECISION NOT NULL,
    "pemaparanScore" DOUBLE PRECISION NOT NULL,
    "komunikasiScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NilaiPresentasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "proposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalGrade" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "lrScore" DOUBLE PRECISION,
    "bimbinganScore" DOUBLE PRECISION,
    "deScore" DOUBLE PRECISION,
    "presentasiScore" DOUBLE PRECISION,
    "weightedTotal" DOUBLE PRECISION,
    "gradeIndex" TEXT,
    "passed" BOOLEAN,
    "computedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Program_code_key" ON "Program"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classId_studentId_key" ON "ClassEnrollment"("classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_enrollmentId_key" ON "Proposal"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EprtRecord_enrollmentId_key" ON "EprtRecord"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "NilaiBimbingan_proposalId_pembimbingId_key" ON "NilaiBimbingan"("proposalId", "pembimbingId");

-- CreateIndex
CREATE UNIQUE INDEX "DeskEvaluation_proposalId_key" ON "DeskEvaluation"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "NilaiLiteratureReview_proposalId_pembimbingId_key" ON "NilaiLiteratureReview"("proposalId", "pembimbingId");

-- CreateIndex
CREATE UNIQUE INDEX "Seminar_proposalId_key" ON "Seminar"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "NilaiPresentasi_seminarId_pembimbingId_key" ON "NilaiPresentasi"("seminarId", "pembimbingId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalGrade_proposalId_key" ON "FinalGrade"("proposalId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_dosenKelasId_fkey" FOREIGN KEY ("dosenKelasId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ClassEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_supervisor1RequestedId_fkey" FOREIGN KEY ("supervisor1RequestedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_supervisor2RequestedId_fkey" FOREIGN KEY ("supervisor2RequestedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_supervisor1AssignedId_fkey" FOREIGN KEY ("supervisor1AssignedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_supervisor2AssignedId_fkey" FOREIGN KEY ("supervisor2AssignedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_deskEvaluatorId_fkey" FOREIGN KEY ("deskEvaluatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BimbinganSession" ADD CONSTRAINT "BimbinganSession_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EprtRecord" ADD CONSTRAINT "EprtRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ClassEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EprtRecord" ADD CONSTRAINT "EprtRecord_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiBimbingan" ADD CONSTRAINT "NilaiBimbingan_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiBimbingan" ADD CONSTRAINT "NilaiBimbingan_pembimbingId_fkey" FOREIGN KEY ("pembimbingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskEvaluation" ADD CONSTRAINT "DeskEvaluation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskEvaluation" ADD CONSTRAINT "DeskEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiLiteratureReview" ADD CONSTRAINT "NilaiLiteratureReview_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiLiteratureReview" ADD CONSTRAINT "NilaiLiteratureReview_pembimbingId_fkey" FOREIGN KEY ("pembimbingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seminar" ADD CONSTRAINT "Seminar_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiPresentasi" ADD CONSTRAINT "NilaiPresentasi_seminarId_fkey" FOREIGN KEY ("seminarId") REFERENCES "Seminar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NilaiPresentasi" ADD CONSTRAINT "NilaiPresentasi_pembimbingId_fkey" FOREIGN KEY ("pembimbingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGrade" ADD CONSTRAINT "FinalGrade_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
