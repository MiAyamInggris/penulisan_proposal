"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { ProdiCode } from "@prisma/client";

export type SidangPreviewRow = {
  row: number;
  nim: string;
  nama: string;
  prodi: ProdiCode | null;
  judul: string;
  kelompokKeilmuan: string;
  kodePembimbing1: string;
  kodePembimbing2: string;
  kodePenguji1: string;
  kodePenguji2: string;
  pembimbing1Id: string | null;
  pembimbing2Id: string | null;
  penguji1Id: string | null;
  penguji2Id: string | null;
  status: "Valid" | "Invalid" | "Warning";
  issues: string[];
};

export type SidangPreviewResult = {
  rows: SidangPreviewRow[];
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
};

export type SidangCommitResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  importBatchId: string;
  rows: { row: number; nim: string; status: string; reason?: string }[];
};

const VALID_PRODI: ProdiCode[] = ["RPL", "IF", "DS", "SI"];

async function requireKetuaOrAdmin() {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");
  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) throw new Error("Tidak terautentikasi");
  return { session, auditRole: isAdmin ? "ADMIN" : ("KETUA_KK" as const) };
}

export async function previewSidangImport(
  formData: FormData,
  method: "full" | "semi"
): Promise<SidangPreviewResult> {
  await requireKetuaOrAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diunggah");

  const { read, utils } = await import("xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const sheetRows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: SidangPreviewResult = {
    rows: [],
    total: sheetRows.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
  };

  if (sheetRows.length === 0) return result;

  // Pre-load all active dosen indexed by kodeDosen (lowercase)
  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true, kodeDosen: { not: null } },
    select: { id: true, name: true, kodeDosen: true },
  });
  const dosenByKode = new Map<string, { id: string; name: string }>();
  for (const d of allDosen) {
    if (d.kodeDosen) dosenByKode.set(d.kodeDosen.toLowerCase(), { id: d.id, name: d.name });
  }

  for (let i = 0; i < sheetRows.length; i++) {
    const rowNum = i + 2;
    const row = sheetRows[i];

    const nim = String(row["NIM"] ?? "").trim();
    const nama = String(row["Nama Mahasiswa"] ?? "").trim();
    const prodiRaw = String(row["Program Studi"] ?? "").trim().toUpperCase();
    const judul = String(row["Judul"] ?? "").trim();
    const kelompokKeilmuan = String(row["Kelompok Keilmuan"] ?? "").trim();
    const kodePembimbing1 = String(row["Kode Pembimbing 1"] ?? "").trim();
    const kodePembimbing2 = String(row["Kode Pembimbing 2"] ?? "").trim();
    const kodePenguji1 = method === "full" ? String(row["Kode Penguji 1"] ?? "").trim() : "";
    const kodePenguji2 = method === "full" ? String(row["Kode Penguji 2"] ?? "").trim() : "";

    const issues: string[] = [];

    if (!nim) issues.push("Kolom NIM wajib diisi");
    if (!nama) issues.push("Kolom Nama Mahasiswa wajib diisi");
    if (!VALID_PRODI.includes(prodiRaw as ProdiCode)) {
      issues.push(`Program Studi tidak valid (harus: RPL, IF, DS, atau SI)`);
    }
    if (!kodePembimbing1) issues.push("Kolom Kode Pembimbing 1 wajib diisi");
    if (method === "full") {
      if (!kodePenguji1) issues.push("Kolom Kode Penguji 1 wajib diisi untuk Metode 1");
      if (!kodePenguji2) issues.push("Kolom Kode Penguji 2 wajib diisi untuk Metode 1");
    }

    const prodi = VALID_PRODI.includes(prodiRaw as ProdiCode) ? (prodiRaw as ProdiCode) : null;

    // Resolve dosen codes
    const pembimbing1 = kodePembimbing1 ? (dosenByKode.get(kodePembimbing1.toLowerCase()) ?? null) : null;
    const pembimbing2 = kodePembimbing2 ? (dosenByKode.get(kodePembimbing2.toLowerCase()) ?? null) : null;
    const penguji1 = kodePenguji1 ? (dosenByKode.get(kodePenguji1.toLowerCase()) ?? null) : null;
    const penguji2 = kodePenguji2 ? (dosenByKode.get(kodePenguji2.toLowerCase()) ?? null) : null;

    if (kodePembimbing1 && !pembimbing1) issues.push(`Kode Pembimbing 1 "${kodePembimbing1}" tidak ditemukan`);
    if (kodePembimbing2 && !pembimbing2) issues.push(`Kode Pembimbing 2 "${kodePembimbing2}" tidak ditemukan`);
    if (kodePenguji1 && !penguji1) issues.push(`Kode Penguji 1 "${kodePenguji1}" tidak ditemukan`);
    if (kodePenguji2 && !penguji2) issues.push(`Kode Penguji 2 "${kodePenguji2}" tidak ditemukan`);

    const warnings: string[] = [];

    if (method === "full" && penguji1 && penguji2) {
      if (penguji1.id === penguji2.id) {
        issues.push("Penguji 1 dan Penguji 2 tidak boleh sama");
      }
      const pembimbingIds = new Set([pembimbing1?.id, pembimbing2?.id].filter(Boolean));
      if (pembimbingIds.has(penguji1.id)) warnings.push(`Penguji 1 (${kodePenguji1}) juga merupakan pembimbing`);
      if (pembimbingIds.has(penguji2.id)) warnings.push(`Penguji 2 (${kodePenguji2}) juga merupakan pembimbing`);
    }

    const allIssues = [...issues, ...warnings];
    let status: "Valid" | "Invalid" | "Warning";
    if (issues.length > 0) {
      status = "Invalid";
      result.invalid++;
    } else if (warnings.length > 0) {
      status = "Warning";
      result.warnings++;
    } else {
      status = "Valid";
      result.valid++;
    }

    result.rows.push({
      row: rowNum,
      nim,
      nama,
      prodi,
      judul,
      kelompokKeilmuan,
      kodePembimbing1,
      kodePembimbing2,
      kodePenguji1,
      kodePenguji2,
      pembimbing1Id: pembimbing1?.id ?? null,
      pembimbing2Id: pembimbing2?.id ?? null,
      penguji1Id: penguji1?.id ?? null,
      penguji2Id: penguji2?.id ?? null,
      status,
      issues: allIssues,
    });
  }

  return result;
}

export async function commitSidangImport(
  rows: SidangPreviewRow[],
  method: "full" | "semi"
): Promise<SidangCommitResult> {
  const { session, auditRole } = await requireKetuaOrAdmin();

  const importBatchId = randomUUID();

  const result: SidangCommitResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    importBatchId,
    rows: [],
  };

  for (const row of rows) {
    if (row.status === "Invalid") {
      result.skipped++;
      result.rows.push({ row: row.row, nim: row.nim, status: "Skipped", reason: row.issues.join("; ") });
      continue;
    }
    if (!row.prodi || !row.pembimbing1Id) {
      result.skipped++;
      result.rows.push({ row: row.row, nim: row.nim, status: "Skipped", reason: "Data tidak lengkap" });
      continue;
    }

    try {
      const existing = await prisma.sidangRecord.findUnique({ where: { nim: row.nim }, select: { id: true } });

      const data = {
        nama: row.nama,
        prodi: row.prodi,
        judul: row.judul || null,
        kelompokKeilmuan: row.kelompokKeilmuan || null,
        pembimbing1Id: row.pembimbing1Id,
        pembimbing2Id: row.pembimbing2Id ?? null,
        ...(method === "full" ? { penguji1Id: row.penguji1Id ?? null, penguji2Id: row.penguji2Id ?? null } : {}),
        importBatchId,
        importedById: session.user.id,
      };

      await prisma.sidangRecord.upsert({
        where: { nim: row.nim },
        create: { nim: row.nim, ...data },
        update: data,
      });

      if (existing) {
        result.updated++;
        result.rows.push({ row: row.row, nim: row.nim, status: "Updated" });
      } else {
        result.created++;
        result.rows.push({ row: row.row, nim: row.nim, status: "Created" });
      }
    } catch (err: unknown) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Gagal memproses data";
      result.rows.push({ row: row.row, nim: row.nim, status: "Failed", reason: msg });
    }
  }

  await logAudit(
    session.user.id,
    auditRole,
    "SIDANG_IMPORT_BULK",
    {
      method,
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      importBatchId,
      message: `${auditRole === "ADMIN" ? "Admin" : "Ketua KK"} imported ${result.created + result.updated} sidang records via Metode ${method === "full" ? "1" : "2"}.`,
    },
    "SIDANG_RECORD"
  );

  revalidatePath("/ketua-kk/plotting-sidang");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/admin/audit-log");

  return result;
}
