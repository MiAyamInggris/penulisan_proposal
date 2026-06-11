"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ProdiCode } from "@prisma/client";
import { getOrCreateTAPastClass } from "@/lib/system-class";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const EMAIL_DOMAIN = "student.telkomuniversity.ac.id";
const PRODI_CODES: ProdiCode[] = ["RPL", "IF", "DS", "SI"];

export type HistoricalQuotaImportResult = {
  total: number;
  imported: number;
  updated: number;
  failed: number;
  warnings: string[];
  errors: Array<{ row: number; nim?: string; reason: string }>;
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
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: HistoricalQuotaImportResult = {
    total: rows.length,
    imported: 0,
    updated: 0,
    failed: 0,
    warnings: [],
    errors: [],
  };

  if (rows.length === 0) return result;

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

  // Pre-load existing mahasiswa by NIM
  const existingMahasiswa = await prisma.user.findMany({
    where: { role: "MAHASISWA" },
    select: { id: true, identifier: true },
  });
  const mahasiswaByNim = new Map(existingMahasiswa.map((u) => [u.identifier.toLowerCase(), u]));

  // Cache of "Tugas Akhir - Past" class id per program
  const taPastClassByProgramId = new Map<string, string>();

  const seenNims = new Set<string>();
  const touchedProdiCodes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const nim = String(row["NIM"] ?? row["nim"] ?? "").trim();
    const nama = String(row["Nama Mahasiswa"] ?? row["Nama"] ?? "").trim();
    const prodiRaw = String(row["Program Studi"] ?? row["Prodi"] ?? "").trim();
    const kode1Raw = String(row["Kode Pembimbing 1"] ?? "").trim();
    const kode2Raw = String(row["Kode Pembimbing 2"] ?? "").trim();

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
      result.failed++;
      result.errors.push({ row: rowNum, nim, reason: "NIM duplikat dalam file" });
      continue;
    }
    seenNims.add(nim.toLowerCase());

    const prodiCode = resolveProdiCode(prodiRaw);
    if (!prodiCode) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        nim,
        reason: `Program Studi '${prodiRaw}' tidak dikenali (gunakan RPL/IF/DS/SI)`,
      });
      continue;
    }
    const program = programByCode.get(prodiCode);
    if (!program) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, reason: `Program Studi ${prodiCode} tidak ditemukan` });
      continue;
    }

    if (!kode1Raw) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, reason: "Kolom Kode Pembimbing 1 wajib diisi" });
      continue;
    }
    const sv1 = dosenByKode.get(kode1Raw.toLowerCase());
    if (!sv1) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, reason: `Pembimbing 1 dengan kode '${kode1Raw}' tidak ditemukan` });
      continue;
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
      // --- Resolve or create the per-program "Tugas Akhir - Past" class ---
      let taPastClassId = taPastClassByProgramId.get(program.id);
      if (!taPastClassId) {
        const fallbackDosenId = isKetuaUser ? session.user.id : program.kaprodiId;
        if (!fallbackDosenId) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            nim,
            reason: `Program Studi ${prodiCode} belum memiliki Kaprodi — tidak dapat membuat kelas sistem Tugas Akhir - Past`,
          });
          continue;
        }
        const taPastClass = await getOrCreateTAPastClass(program.id, fallbackDosenId);
        taPastClassId = taPastClass.id;
        taPastClassByProgramId.set(program.id, taPastClassId);
      }

      // --- Resolve or create mahasiswa ---
      let userId: string;
      const existingUser = mahasiswaByNim.get(nim.toLowerCase());
      if (existingUser) {
        userId = existingUser.id;
      } else {
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
        userId = newUser.id;
        mahasiswaByNim.set(nim.toLowerCase(), { id: userId, identifier: nim });
      }

      // --- Resolve or create the (hidden, inactive) enrollment in Tugas Akhir - Past ---
      let enrollment = await prisma.classEnrollment.findUnique({
        where: { classId_studentId: { classId: taPastClassId, studentId: userId } },
        select: { id: true, proposal: { select: { id: true } } },
      });
      if (!enrollment) {
        const created = await prisma.classEnrollment.create({
          data: { classId: taPastClassId, studentId: userId, isActive: false },
          select: { id: true, proposal: { select: { id: true } } },
        });
        enrollment = created;
      }

      // --- Upsert the historical quota proposal ---
      const proposalData = {
        titleId: "Data Historis Kuota TA2",
        status: "COMPLETED" as const,
        academicStage: "TUGAS_AKHIR_2" as const,
        isHistoricalImport: true,
        historicalImportSource: "KETUA_KK_TA_PAST" as const,
        supervisor1AssignedId: sv1.id,
        supervisor2AssignedId: sv2?.id ?? null,
      };

      if (enrollment.proposal) {
        await prisma.proposal.update({ where: { id: enrollment.proposal.id }, data: proposalData });
        result.updated++;
      } else {
        await prisma.proposal.create({ data: { enrollmentId: enrollment.id, ...proposalData } });
        result.imported++;
      }

      touchedProdiCodes.add(prodiCode);
    } catch (err: unknown) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Gagal memproses data";
      result.errors.push({ row: rowNum, nim, reason: msg });
    }
  }

  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  revalidatePath("/ketua-kk/import");
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
      failed: result.failed,
      programs: [...touchedProdiCodes],
      message: `${auditRole === "ADMIN" ? "Admin" : "Ketua KK"} mengimpor ${result.imported + result.updated} mahasiswa ke Tugas Akhir - Past`,
    },
    "CLASS"
  );

  return result;
}
