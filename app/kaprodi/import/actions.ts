"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getMyProdi } from "@/lib/kaprodi";
import { computeFinalGrade } from "@/lib/grade-engine";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const EMAIL_DOMAIN = "student.telkomuniversity.ac.id";

export type HistoricalImportResult = {
  total: number;
  enrolled: number;
  skipped: number;
  failed: number;
  warnings: string[];
  errors: Array<{ row: number; nim?: string; reason: string }>;
};

type DosenLookup = {
  id: string;
  name: string;
  email: string;
  identifier: string;
  kodeDosen: string | null;
};

function resolveDosenId(
  raw: string,
  byEmail: Map<string, DosenLookup>,
  byNip: Map<string, DosenLookup>,
  byKode: Map<string, DosenLookup>
): { id: string; name: string } | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return byEmail.get(key) ?? byNip.get(key) ?? byKode.get(key) ?? null;
}

function parseFloat_safe(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  if (n < 0 || n > 100) return null;
  return n;
}

export async function bulkImportHistorical(
  classId: string,
  formData: FormData
): Promise<HistoricalImportResult> {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.isKaprodi) {
    throw new Error("Tidak terautentikasi");
  }

  const [prodi, kaprodiUser] = await Promise.all([
    getMyProdi(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  if (!prodi) throw new Error("Anda tidak memiliki Program Studi yang ditetapkan");
  const kaprodiName = kaprodiUser?.name ?? "Kaprodi";

  // Validate class belongs to kaprodi's prodi
  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: { program: true },
  });
  if (!targetClass) throw new Error("Kelas tidak ditemukan");
  if (targetClass.programId !== prodi.id) {
    throw new Error("Kelas tidak termasuk dalam Program Studi Anda");
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diunggah");

  const { read, utils } = await import("xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: HistoricalImportResult = {
    total: rows.length,
    enrolled: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    errors: [],
  };

  if (rows.length === 0) return result;

  // Pre-load all dosen for fast lookup
  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    select: { id: true, name: true, email: true, identifier: true, kodeDosen: true },
  });
  const dosenByEmail = new Map(allDosen.map((d) => [d.email.toLowerCase(), d]));
  const dosenByNip = new Map(
    allDosen.filter((d) => d.identifier).map((d) => [d.identifier.toLowerCase(), d])
  );
  const dosenByKode = new Map(
    allDosen.filter((d) => d.kodeDosen).map((d) => [d.kodeDosen!.toLowerCase(), d])
  );

  // Pre-load all mahasiswa for fast lookup
  const existingMahasiswa = await prisma.user.findMany({
    where: { role: "MAHASISWA" },
    select: { id: true, email: true, identifier: true },
  });
  const mahasiswaByEmail = new Map(existingMahasiswa.map((u) => [u.email.toLowerCase(), u]));
  const mahasiswaByNim = new Map(existingMahasiswa.map((u) => [u.identifier.toLowerCase(), u]));

  // Pre-load current enrollments in this class
  const currentEnrollments = await prisma.classEnrollment.findMany({
    where: { classId },
    select: { id: true, studentId: true, isActive: true, proposal: { select: { id: true, isHistoricalImport: true } } },
  });
  const enrollmentByStudentId = new Map(currentEnrollments.map((e) => [e.studentId, e]));

  const seenNims = new Set<string>();
  const scoreAuditEntries: Array<Prisma.AuditLogCreateManyInput> = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const nim = String(row["NIM"] ?? row["nim"] ?? row["Nim"] ?? "").trim();
    const nama = String(
      row["Nama Mahasiswa"] ?? row["Nama"] ?? row["nama"] ?? row["NAMA"] ?? ""
    ).trim();
    const judulRaw = String(row["Judul Proposal"] ?? row["Judul"] ?? "").trim();
    const judul = judulRaw || "Data Historis";

    const pembimbing1Raw = String(
      row["Pembimbing 1 (Email/NIP/Kode)"] ??
      row["Pembimbing 1"] ??
      row["pembimbing1"] ??
      ""
    ).trim();
    const pembimbing2Raw = String(
      row["Pembimbing 2 (Email/NIP/Kode)"] ??
      row["Pembimbing 2"] ??
      row["pembimbing2"] ??
      ""
    ).trim();
    const deskEvalRaw = String(
      row["Desk Evaluator (Email/NIP/Kode)"] ??
      row["Desk Evaluator"] ??
      row["desk_evaluator"] ??
      ""
    ).trim();

    // Per-pembimbing scores (new template format)
    const nilaiB1 = parseFloat_safe(
      row["Nilai Bimbingan Pembimbing 1"] ?? row["Nilai Bimbingan"] ?? row["nilai_bimbingan"]
    );
    const nilaiB2 = parseFloat_safe(
      row["Nilai Bimbingan Pembimbing 2"] ?? null
    );
    const nilaiLR1 = parseFloat_safe(
      row["Nilai Literature Review Pembimbing 1"] ?? row["Nilai Literature Review"] ?? row["nilai_lr"]
    );
    const nilaiLR2 = parseFloat_safe(
      row["Nilai Literature Review Pembimbing 2"] ?? null
    );
    const nilaiP1 = parseFloat_safe(
      row["Nilai Presentasi Pembimbing 1"] ?? row["Nilai Presentasi"] ?? row["nilai_presentasi"]
    );
    const nilaiP2 = parseFloat_safe(
      row["Nilai Presentasi Pembimbing 2"] ?? null
    );
    const nilaiDE = parseFloat_safe(
      row["Nilai Desk Evaluation"] ?? row["Nilai Desk Evaluasi"] ?? row["nilai_de"]
    );

    // Validation
    if (!nim) {
      result.failed++;
      result.errors.push({ row: rowNum, reason: "Kolom NIM wajib diisi" });
      continue;
    }
    if (!nama) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, reason: "Kolom Nama Mahasiswa wajib diisi" });
      continue;
    }
    if (seenNims.has(nim.toLowerCase())) {
      result.skipped++;
      result.errors.push({ row: rowNum, nim, reason: "NIM duplikat dalam file" });
      continue;
    }
    seenNims.add(nim.toLowerCase());

    // Resolve dosen
    const sv1 = pembimbing1Raw
      ? resolveDosenId(pembimbing1Raw, dosenByEmail, dosenByNip, dosenByKode)
      : null;
    const sv2 = pembimbing2Raw
      ? resolveDosenId(pembimbing2Raw, dosenByEmail, dosenByNip, dosenByKode)
      : null;
    const de = deskEvalRaw
      ? resolveDosenId(deskEvalRaw, dosenByEmail, dosenByNip, dosenByKode)
      : null;

    if (pembimbing1Raw && !sv1) {
      result.warnings.push(
        `Baris ${rowNum} (${nim}): Pembimbing 1 '${pembimbing1Raw}' tidak ditemukan — dilewati`
      );
    }
    if (pembimbing2Raw && !sv2) {
      result.warnings.push(
        `Baris ${rowNum} (${nim}): Pembimbing 2 '${pembimbing2Raw}' tidak ditemukan — dilewati`
      );
    }
    if (deskEvalRaw && !de) {
      result.warnings.push(
        `Baris ${rowNum} (${nim}): Desk Evaluator '${deskEvalRaw}' tidak ditemukan — dilewati`
      );
    }
    if (nilaiB2 !== null && !sv2) {
      result.warnings.push(
        `Baris ${rowNum} (${nim}): Nilai Bimbingan P2 diberikan tetapi Pembimbing 2 tidak ditemukan — dilewati`
      );
    }
    if (nilaiDE !== null && !de) {
      result.warnings.push(
        `Baris ${rowNum} (${nim}): Nilai Desk Evaluation diberikan tetapi Desk Evaluator tidak ditemukan — tidak tersimpan`
      );
    }

    const email = `${nim}@${EMAIL_DOMAIN}`;

    try {
      // --- Resolve or create mahasiswa ---
      let userId: string;
      const existByNim = mahasiswaByNim.get(nim.toLowerCase());
      const existByEmail = mahasiswaByEmail.get(email.toLowerCase());
      const existingUser = existByNim ?? existByEmail;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const hashed = await bcrypt.hash(nim, 10);
        const newUser = await prisma.user.create({
          data: { name: nama, email, password: hashed, role: "MAHASISWA", identifier: nim },
          select: { id: true },
        });
        userId = newUser.id;
        mahasiswaByNim.set(nim.toLowerCase(), { id: userId, email, identifier: nim });
        mahasiswaByEmail.set(email.toLowerCase(), { id: userId, email, identifier: nim });
      }

      // --- Resolve or create enrollment ---
      const existingEnrollment = enrollmentByStudentId.get(userId);
      let enrollmentId: string;
      let proposalId: string | null = null;

      if (existingEnrollment) {
        enrollmentId = existingEnrollment.id;
        proposalId = existingEnrollment.proposal?.id ?? null;

        if (!existingEnrollment.isActive) {
          await prisma.classEnrollment.update({
            where: { id: enrollmentId },
            data: { isActive: true },
          });
        }

        // If a non-historical proposal already exists, skip to avoid overwriting live data
        if (proposalId && !existingEnrollment.proposal?.isHistoricalImport) {
          result.skipped++;
          result.errors.push({
            row: rowNum,
            nim,
            reason: "Mahasiswa sudah memiliki proposal aktif di kelas ini — dilewati",
          });
          continue;
        }
      } else {
        const newEnrollment = await prisma.classEnrollment.create({
          data: { classId, studentId: userId },
          select: { id: true },
        });
        enrollmentId = newEnrollment.id;
        enrollmentByStudentId.set(userId, {
          id: enrollmentId,
          studentId: userId,
          isActive: true,
          proposal: null,
        });
      }

      // --- Upsert historical proposal ---
      const proposalData = {
        titleId: judul,
        status: "COMPLETED" as const,
        isHistoricalImport: true,
        supervisor1AssignedId: sv1?.id ?? null,
        supervisor2AssignedId: sv2?.id ?? null,
        deskEvaluatorId: de?.id ?? null,
      };

      if (proposalId) {
        await prisma.proposal.update({ where: { id: proposalId }, data: proposalData });
      } else {
        const newProposal = await prisma.proposal.create({
          data: { enrollmentId, ...proposalData },
          select: { id: true },
        });
        proposalId = newProposal.id;
      }

      // --- Create per-pembimbing assessment records ---

      const importBase = {
        userId: session.user.id,
        userRole: "KAPRODI",
        action: "SCORE_CREATE",
        entityType: "PROPOSAL",
        entityId: proposalId!,
        mahasiswaName: nama,
        mahasiswaNim: nim,
        classCode: targetClass.code,
        importedBy: kaprodiName,
        source: "BULK_IMPORT",
      };

      // NilaiBimbingan (7 rubric fields, each = score / 7)
      if (sv1 && nilaiB1 !== null) {
        const perField = nilaiB1 / 7;
        const fields = {
          pemilihanTema: perField, researchQuestion: perField, studiLiteratur1: perField,
          studiLiteratur2: perField, rencanaImplementasi: perField,
          kemandirian: perField, prosesBimbingan: perField,
        };
        await prisma.nilaiBimbingan.upsert({
          where: { proposalId_pembimbingId: { proposalId: proposalId!, pembimbingId: sv1.id } },
          update: fields,
          create: { proposalId: proposalId!, pembimbingId: sv1.id, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "NILAI_BIMBINGAN", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: sv1.name, dosenRole: "PEMBIMBING_1", isUpdate: false, previousTotal: null, newTotal: nilaiB1, previousFields: null, newFields: fields, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }
      if (sv2 && nilaiB2 !== null) {
        const perField = nilaiB2 / 7;
        const fields = {
          pemilihanTema: perField, researchQuestion: perField, studiLiteratur1: perField,
          studiLiteratur2: perField, rencanaImplementasi: perField,
          kemandirian: perField, prosesBimbingan: perField,
        };
        await prisma.nilaiBimbingan.upsert({
          where: { proposalId_pembimbingId: { proposalId: proposalId!, pembimbingId: sv2.id } },
          update: fields,
          create: { proposalId: proposalId!, pembimbingId: sv2.id, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "NILAI_BIMBINGAN", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: sv2.name, dosenRole: "PEMBIMBING_2", isUpdate: false, previousTotal: null, newTotal: nilaiB2, previousFields: null, newFields: fields, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }

      // NilaiLiteratureReview (6 rubric fields, each = score / 6)
      if (sv1 && nilaiLR1 !== null) {
        const perField = nilaiLR1 / 6;
        const fields = {
          kualitasPustaka: perField, kontenRumusan: perField, analisisTujuan: perField,
          kelengkapanKajian: perField, kelebihanKekurangan: perField, relasiTeori: perField,
        };
        await prisma.nilaiLiteratureReview.upsert({
          where: { proposalId_pembimbingId: { proposalId: proposalId!, pembimbingId: sv1.id } },
          update: fields,
          create: { proposalId: proposalId!, pembimbingId: sv1.id, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "NILAI_LR", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: sv1.name, dosenRole: "PEMBIMBING_1", isUpdate: false, previousTotal: null, newTotal: nilaiLR1, previousFields: null, newFields: fields, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }
      if (sv2 && nilaiLR2 !== null) {
        const perField = nilaiLR2 / 6;
        const fields = {
          kualitasPustaka: perField, kontenRumusan: perField, analisisTujuan: perField,
          kelengkapanKajian: perField, kelebihanKekurangan: perField, relasiTeori: perField,
        };
        await prisma.nilaiLiteratureReview.upsert({
          where: { proposalId_pembimbingId: { proposalId: proposalId!, pembimbingId: sv2.id } },
          update: fields,
          create: { proposalId: proposalId!, pembimbingId: sv2.id, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "NILAI_LR", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: sv2.name, dosenRole: "PEMBIMBING_2", isUpdate: false, previousTotal: null, newTotal: nilaiLR2, previousFields: null, newFields: fields, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }

      // Seminar (required as FK for NilaiPresentasi)
      let seminarId: string | null = null;
      if ((sv1 && nilaiP1 !== null) || (sv2 && nilaiP2 !== null)) {
        const existingSeminar = await prisma.seminar.findUnique({
          where: { proposalId: proposalId! },
          select: { id: true },
        });
        if (existingSeminar) {
          seminarId = existingSeminar.id;
        } else {
          const newSeminar = await prisma.seminar.create({
            data: { proposalId: proposalId!, status: "COMPLETED" },
            select: { id: true },
          });
          seminarId = newSeminar.id;
        }
      }

      // NilaiPresentasi (5 rubric fields, each = score / 5)
      if (seminarId && sv1 && nilaiP1 !== null) {
        const perField = nilaiP1 / 5;
        const fields = {
          latarBelakangScore: perField, teoriPendukungScore: perField,
          toolsPemodelanScore: perField, pemaparanScore: perField, komunikasiScore: perField,
        };
        await prisma.nilaiPresentasi.upsert({
          where: { seminarId_pembimbingId: { seminarId, pembimbingId: sv1.id } },
          update: fields,
          create: { seminarId, pembimbingId: sv1.id, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "NILAI_PRESENTASI", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: sv1.name, dosenRole: "PEMBIMBING_1", isUpdate: false, previousTotal: null, newTotal: nilaiP1, previousFields: null, newFields: fields, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }
      if (seminarId && sv2 && nilaiP2 !== null) {
        const perField = nilaiP2 / 5;
        const fields = {
          latarBelakangScore: perField, teoriPendukungScore: perField,
          toolsPemodelanScore: perField, pemaparanScore: perField, komunikasiScore: perField,
        };
        await prisma.nilaiPresentasi.upsert({
          where: { seminarId_pembimbingId: { seminarId, pembimbingId: sv2.id } },
          update: fields,
          create: { seminarId, pembimbingId: sv2.id, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "NILAI_PRESENTASI", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: sv2.name, dosenRole: "PEMBIMBING_2", isUpdate: false, previousTotal: null, newTotal: nilaiP2, previousFields: null, newFields: fields, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }

      // DeskEvaluation (4 rubric fields, each = score / 4); requires evaluator
      if (de && nilaiDE !== null) {
        const perField = nilaiDE / 4;
        const fields = {
          latarBelakang: perField, formulasiMasalah: perField,
          teoriPendukung: perField, ideMetode: perField,
        };
        await prisma.deskEvaluation.upsert({
          where: { proposalId: proposalId! },
          update: { evaluatorId: de.id, isLate: false, ...fields },
          create: { proposalId: proposalId!, evaluatorId: de.id, isLate: false, ...fields },
        });
        scoreAuditEntries.push({
          userId: importBase.userId, userRole: importBase.userRole, action: importBase.action,
          entityType: importBase.entityType, entityId: importBase.entityId,
          detail: { assessmentType: "DESK_EVALUATION", proposalId: proposalId!, mahasiswaName: nama, mahasiswaNim: nim, classCode: targetClass.code, dosenName: de.name, dosenRole: "DESK_EVALUATOR", isUpdate: false, previousTotal: null, newTotal: nilaiDE, previousFields: null, newFields: { ...fields, isLate: false }, source: "BULK_IMPORT", importedBy: kaprodiName } as Prisma.InputJsonValue,
        });
      }

      // --- Compute final grade via grade engine ---
      await computeFinalGrade(proposalId!);

      result.enrolled++;
    } catch (err: unknown) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Gagal memproses data";
      result.errors.push({ row: rowNum, nim, reason: msg });
    }
  }

  // Revalidate relevant paths
  revalidatePath("/kaprodi/dashboard");
  revalidatePath("/kaprodi/rekap");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  revalidatePath("/admin/audit-log");

  // Batch-insert per-score audit entries
  if (scoreAuditEntries.length > 0) {
    try {
      await prisma.auditLog.createMany({ data: scoreAuditEntries });
    } catch {
      // Audit log failure must not break the import
    }
  }

  // Write summary audit log entry
  await logAudit(
    session.user.id,
    "KAPRODI",
    "BULK_IMPORT_HISTORICAL",
    {
      classId,
      classCode: targetClass.code,
      prodiCode: prodi.code,
      total: result.total,
      enrolled: result.enrolled,
      skipped: result.skipped,
      failed: result.failed,
    },
    "CLASS",
    classId
  );

  return result;
}
