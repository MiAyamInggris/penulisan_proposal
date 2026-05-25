"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyProdi } from "@/lib/kaprodi";
import { getGradeIndex } from "@/lib/grade-engine";
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

  const prodi = await getMyProdi(session.user.id);
  if (!prodi) throw new Error("Anda tidak memiliki Program Studi yang ditetapkan");

  // Validate class belongs to kaprodi's prodi
  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: { program: true },
  });
  if (!targetClass) throw new Error("Kelas tidak ditemukan");
  if (targetClass.programId !== prodi.id) {
    throw new Error("Kelas tidak termasuk dalam Program Studi Anda");
  }

  const program = targetClass.program;

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

    const nilaiB = parseFloat_safe(row["Nilai Bimbingan"] ?? row["nilai_bimbingan"]);
    const nilaiLR = parseFloat_safe(row["Nilai Literature Review"] ?? row["nilai_lr"]);
    const nilaiDE = parseFloat_safe(
      row["Nilai Desk Evaluation"] ?? row["Nilai Desk Evaluasi"] ?? row["nilai_de"]
    );
    const nilaiP = parseFloat_safe(row["Nilai Presentasi"] ?? row["nilai_presentasi"]);

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

      // --- Compute and upsert FinalGrade ---
      const allScoresPresent =
        nilaiB !== null && nilaiLR !== null && nilaiDE !== null && nilaiP !== null;

      let weightedTotal: number | null = null;
      let gradeIndex: string | null = null;
      let passed: boolean | null = null;

      if (allScoresPresent) {
        weightedTotal =
          (nilaiLR! * program.literatureReviewPct) / 100 +
          (nilaiB! * program.bimbinganPct) / 100 +
          (nilaiDE! * program.deskEvaluationPct) / 100 +
          (nilaiP! * program.presentasiPct) / 100;
        gradeIndex = getGradeIndex(weightedTotal);
        passed = weightedTotal > 50;
      }

      const gradeData = {
        lrScore: nilaiLR,
        bimbinganScore: nilaiB,
        deScore: nilaiDE,
        presentasiScore: nilaiP,
        weightedTotal,
        gradeIndex,
        passed,
        computedAt: weightedTotal !== null ? new Date() : null,
      };

      await prisma.finalGrade.upsert({
        where: { proposalId: proposalId! },
        update: gradeData,
        create: { proposalId: proposalId!, ...gradeData },
      });

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

  // Write audit log entry
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
