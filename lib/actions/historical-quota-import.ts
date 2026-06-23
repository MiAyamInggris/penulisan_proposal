"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ProdiCode } from "@prisma/client";
import { getOrCreateTAPastClass } from "@/lib/system-class";
import { logAudit, type AssignmentChange } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const EMAIL_DOMAIN = "student.telkomuniversity.ac.id";
const PRODI_CODES: ProdiCode[] = ["RPL", "IF", "DS", "SI"];

export type HistoricalQuotaImportRowStatus =
  | "Imported"
  | "Updated"
  | "Skipped No Change"
  | "Missing Pembimbing"
  | "Skipped Existing"
  | "Invalid Data"
  | "Failed";

export type HistoricalQuotaImportResult = {
  total: number;
  imported: number;
  updated: number;
  skippedNoChange: number;
  missingPembimbing: number;
  skippedExisting: number;
  invalidData: number;
  failedRows: number;
  importBatchId: string;
  warnings: string[];
  errors: Array<{ row: number; nim?: string; reason: string }>;
  rows: Array<{
    row: number;
    nim: string;
    nama: string;
    prodi: string;
    status: HistoricalQuotaImportRowStatus;
    reason?: string;
  }>;
};

function resolveProdiCode(raw: string): ProdiCode | null {
  const key = raw.trim().toUpperCase();
  return (PRODI_CODES.find((c) => c === key) as ProdiCode | undefined) ?? null;
}

export async function bulkImportHistoricalQuota(
  formData: FormData
): Promise<HistoricalQuotaImportResult> {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");

  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) throw new Error("Tidak terautentikasi");

  const auditRole = isAdmin ? "ADMIN" : "KETUA_KK";

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diunggah");

  const { read, utils } = await import("xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const sheetRows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const importBatchId = randomUUID();

  const result: HistoricalQuotaImportResult = {
    total: sheetRows.length,
    imported: 0,
    updated: 0,
    skippedNoChange: 0,
    missingPembimbing: 0,
    skippedExisting: 0,
    invalidData: 0,
    failedRows: 0,
    importBatchId,
    warnings: [],
    errors: [],
    rows: [],
  };

  if (sheetRows.length === 0) return result;

  // Pre-load programs
  const programs = await prisma.program.findMany({
    select: { id: true, code: true, kaprodiId: true },
  });
  const programByCode = new Map(programs.map((p) => [p.code, p]));

  // Pre-load dosen by kode dosen only (per spec: match strictly by Kode Pembimbing)
  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true, kodeDosen: { not: null } },
    select: { id: true, name: true, kodeDosen: true },
  });
  const dosenByKode = new Map(
    allDosen.map((d) => [d.kodeDosen!.trim().toLowerCase(), d])
  );
  const kodeById = new Map(allDosen.map((d) => [d.id, d.kodeDosen!]));

  // Pre-load existing mahasiswa by NIM (+ name index for Priority 2 matching)
  const existingMahasiswa = await prisma.user.findMany({
    where: { role: "MAHASISWA" },
    select: { id: true, identifier: true, name: true },
  });
  const mahasiswaByNim = new Map(existingMahasiswa.map((u) => [u.identifier.toLowerCase(), u]));
  const mahasiswaByNama = new Map<string, string>(); // nama(lower) -> nim
  for (const u of existingMahasiswa) {
    mahasiswaByNama.set(u.name.toLowerCase().trim(), u.identifier);
  }

  // Cache of "Tugas Akhir - Past" class id per program
  const taPastClassByProgramId = new Map<string, string>();

  const seenNims = new Set<string>();
  const touchedProdiCodes = new Set<string>();
  const skippedNims: string[] = [];

  for (let i = 0; i < sheetRows.length; i++) {
    const rowNum = i + 2;
    const row = sheetRows[i];

    const nim = String(row["NIM"] ?? row["nim"] ?? "").trim();
    const nama = String(row["Nama Mahasiswa"] ?? row["Nama"] ?? "").trim();
    const prodiRaw = String(row["Program Studi"] ?? row["Prodi"] ?? "").trim();
    const kode1Raw = String(row["Kode Pembimbing 1"] ?? "").trim();
    const kode2Raw = String(row["Kode Pembimbing 2"] ?? "").trim();

    if (!nim) {
      result.invalidData++;
      result.errors.push({ row: rowNum, reason: "Kolom NIM wajib diisi" });
      result.rows.push({ row: rowNum, nim: "", nama, prodi: prodiRaw, status: "Invalid Data", reason: "Kolom NIM wajib diisi" });
      continue;
    }
    if (!nama) {
      result.invalidData++;
      result.errors.push({ row: rowNum, nim, reason: "Kolom Nama Mahasiswa wajib diisi" });
      result.rows.push({ row: rowNum, nim, nama: "", prodi: prodiRaw, status: "Invalid Data", reason: "Kolom Nama Mahasiswa wajib diisi" });
      continue;
    }
    if (seenNims.has(nim.toLowerCase())) {
      result.invalidData++;
      result.errors.push({ row: rowNum, nim, reason: "NIM duplikat dalam file" });
      result.rows.push({ row: rowNum, nim, nama, prodi: prodiRaw, status: "Invalid Data", reason: "NIM duplikat dalam file" });
      continue;
    }
    seenNims.add(nim.toLowerCase());

    const prodiCode = resolveProdiCode(prodiRaw);
    if (!prodiCode) {
      result.invalidData++;
      result.errors.push({
        row: rowNum,
        nim,
        reason: `Program Studi '${prodiRaw}' tidak dikenali (gunakan RPL/IF/DS/SI)`,
      });
      result.rows.push({ row: rowNum, nim, nama, prodi: prodiRaw, status: "Invalid Data", reason: `Program Studi '${prodiRaw}' tidak dikenali` });
      continue;
    }
    const program = programByCode.get(prodiCode);
    if (!program) {
      result.invalidData++;
      result.errors.push({ row: rowNum, nim, reason: `Program Studi ${prodiCode} tidak ditemukan` });
      result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Invalid Data", reason: `Program Studi ${prodiCode} tidak ditemukan` });
      continue;
    }

    // Mahasiswa matching: Priority 1 = NIM, Priority 2 = Nama (exact match, different NIM → warn)
    const existingMhs = mahasiswaByNim.get(nim.toLowerCase());
    if (!existingMhs) {
      const nameMatchNim = mahasiswaByNama.get(nama.toLowerCase().trim());
      if (nameMatchNim && nameMatchNim.toLowerCase() !== nim.toLowerCase()) {
        result.warnings.push(
          `Baris ${rowNum}: Nama "${nama}" cocok dengan mahasiswa lain (NIM: ${nameMatchNim}) — periksa kemungkinan duplikat/kesalahan input NIM`
        );
      }
    }

    // --- Resolve pembimbing — missing/unmatched no longer fails the row ---
    let sv1: { id: string; name: string; kodeDosen: string | null } | undefined;
    if (kode1Raw) {
      sv1 = dosenByKode.get(kode1Raw.toLowerCase());
      if (!sv1) {
        result.warnings.push(
          `Baris ${rowNum} (${nim}): Pembimbing 1 dengan kode '${kode1Raw}' tidak ditemukan — pembimbing belum ditetapkan`
        );
      }
    } else {
      result.warnings.push(`Baris ${rowNum} (${nim}): Kode Pembimbing 1 kosong — pembimbing belum ditetapkan`);
    }

    let sv2: { id: string; name: string; kodeDosen: string | null } | undefined;
    if (kode2Raw) {
      sv2 = dosenByKode.get(kode2Raw.toLowerCase());
      if (!sv2) {
        result.warnings.push(
          `Baris ${rowNum} (${nim}): Pembimbing 2 dengan kode '${kode2Raw}' tidak ditemukan — dilewati`
        );
      }
    }

    try {
      // --- Resolve or create the per-program "Tugas Akhir - Past" class (needed for both branches) ---
      let taPastClassId = taPastClassByProgramId.get(program.id);
      if (!taPastClassId) {
        const fallbackDosenId = isKetuaUser ? session.user.id : program.kaprodiId;
        if (!fallbackDosenId) {
          result.failedRows++;
          result.errors.push({
            row: rowNum,
            nim,
            reason: `Program Studi ${prodiCode} belum memiliki Kaprodi — tidak dapat membuat kelas sistem Tugas Akhir - Past`,
          });
          result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Failed", reason: `Program Studi ${prodiCode} belum memiliki Kaprodi` });
          continue;
        }
        const taPastClass = await getOrCreateTAPastClass(program.id, fallbackDosenId);
        taPastClassId = taPastClass.id;
        taPastClassByProgramId.set(program.id, taPastClassId);
      }

      // ════════════════════════════════════════════════════════════════════
      // BRANCH A: mahasiswa already has an account — check for an existing
      // historical TA2 record to update or skip; never create a duplicate.
      // ════════════════════════════════════════════════════════════════════
      if (existingMhs) {
        const enrollment = await prisma.classEnrollment.findUnique({
          where: { classId_studentId: { classId: taPastClassId, studentId: existingMhs.id } },
          select: {
            id: true,
            proposal: { select: { id: true, supervisor1AssignedId: true, supervisor2AssignedId: true } },
          },
        });

        if (!enrollment || !enrollment.proposal) {
          result.skippedExisting++;
          skippedNims.push(nim);
          result.rows.push({
            row: rowNum, nim, nama, prodi: prodiCode, status: "Skipped Existing",
            reason: "Mahasiswa sudah terdaftar namun tidak memiliki data historis TA2 — baris dilewati",
          });
          continue;
        }

        const prevSv1Id = enrollment.proposal.supervisor1AssignedId;
        const prevSv2Id = enrollment.proposal.supervisor2AssignedId;
        const newSv1Id = sv1?.id ?? null;
        const newSv2Id = sv2?.id ?? null;

        if (prevSv1Id === newSv1Id && prevSv2Id === newSv2Id) {
          result.skippedNoChange++;
          result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Skipped No Change", reason: "Data pembimbing tidak berubah" });
          continue;
        }

        const changes: AssignmentChange[] = [];
        if (prevSv1Id !== newSv1Id) {
          changes.push({ field: "Pembimbing 1", previous: prevSv1Id ? (kodeById.get(prevSv1Id) ?? "—") : "—", new: sv1?.kodeDosen ?? "—" });
        }
        if (prevSv2Id !== newSv2Id) {
          changes.push({ field: "Pembimbing 2", previous: prevSv2Id ? (kodeById.get(prevSv2Id) ?? "—") : "—", new: sv2?.kodeDosen ?? "—" });
        }

        await prisma.proposal.update({
          where: { id: enrollment.proposal.id },
          data: { supervisor1AssignedId: newSv1Id, supervisor2AssignedId: newSv2Id },
        });

        result.updated++;
        const changeSummary = changes.map((c) => `${c.field}: ${c.previous} → ${c.new}`).join("; ");
        result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Updated", reason: changeSummary });

        await logAudit(
          session.user.id,
          auditRole,
          "ASSIGNMENT_UPDATED",
          {
            source: "HISTORICAL_TA2",
            nim, nama, changes,
            message: changeSummary,
          },
          "PROPOSAL",
          enrollment.proposal.id
        );

        touchedProdiCodes.add(prodiCode);
        continue;
      }

      // ════════════════════════════════════════════════════════════════════
      // BRANCH B: brand new mahasiswa — create user + enrollment + proposal.
      // ════════════════════════════════════════════════════════════════════
      const hashed = await bcrypt.hash(nim, 10);
      const newUser = await prisma.user.create({
        data: {
          name: nama,
          email: `${nim}@${EMAIL_DOMAIN}`,
          password: hashed,
          role: "MAHASISWA",
          identifier: nim,
        },
        select: { id: true },
      });
      const userId = newUser.id;
      mahasiswaByNim.set(nim.toLowerCase(), { id: userId, identifier: nim, name: nama });

      const created = await prisma.classEnrollment.create({
        data: { classId: taPastClassId, studentId: userId, isActive: false },
        select: { id: true },
      });

      await prisma.proposal.create({
        data: {
          enrollmentId: created.id,
          titleId: "Data Historis Kuota TA2",
          status: "COMPLETED",
          academicStage: "TUGAS_AKHIR_2",
          isHistoricalImport: true,
          historicalImportSource: "KETUA_KK_TA_PAST",
          importBatchId,
          supervisor1AssignedId: sv1?.id ?? null,
          supervisor2AssignedId: sv2?.id ?? null,
        },
      });

      result.imported++;
      if (!sv1) {
        result.missingPembimbing++;
        result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Missing Pembimbing", reason: "Pembimbing 1 belum ditetapkan" });
      } else {
        result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Imported" });
      }

      touchedProdiCodes.add(prodiCode);
    } catch (err: unknown) {
      result.failedRows++;
      const msg = err instanceof Error ? err.message : "Gagal memproses data";
      result.errors.push({ row: rowNum, nim, reason: msg });
      result.rows.push({ row: rowNum, nim, nama, prodi: prodiCode, status: "Failed", reason: msg });
    }
  }

  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  revalidatePath("/ketua-kk/import");
  revalidatePath("/ketua-kk/mahasiswa-belum-pembimbing");
  revalidatePath("/kaprodi/dashboard");
  revalidatePath("/admin/audit-log");

  await logAudit(
    session.user.id,
    auditRole,
    "BULK_IMPORT_HISTORICAL_QUOTA",
    {
      total: result.total,
      imported: result.imported,
      updated: result.updated,
      skippedNoChange: result.skippedNoChange,
      missingPembimbing: result.missingPembimbing,
      skippedExisting: result.skippedExisting,
      invalidData: result.invalidData,
      failedRows: result.failedRows,
      importBatchId,
      programs: [...touchedProdiCodes],
      skippedNims,
      message: `${auditRole === "ADMIN" ? "Admin" : "Ketua KK"} imported ${result.imported} new and updated ${result.updated} TA2 students.${skippedNims.length > 0 ? ` ${skippedNims.length} mahasiswa skipped (no historical data).` : ""}`,
    },
    "CLASS"
  );

  return result;
}
