"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export type GraduateRowStatus = "Valid" | "Invalid";

export type GraduatePreviewRow = {
  row: number;
  nim: string;
  namaInput: string;
  studentName?: string;
  kodePembimbing1: string;
  kodePembimbing2: string;
  tanggalYudisium: string;
  status: GraduateRowStatus;
  reason?: string;
  proposalId?: string;
  currentStatus?: string;
};

export type GraduatePreviewResult = {
  total: number;
  valid: number;
  invalid: number;
  rows: GraduatePreviewRow[];
};

export type GraduateCommitRowStatus = "Graduated" | "Skipped" | "Failed";

export type GraduateCommitResult = {
  total: number;
  graduated: number;
  skipped: number;
  failed: number;
  importBatchId: string;
  rows: Array<{ row: number; nim: string; nama: string; status: GraduateCommitRowStatus; reason?: string }>;
};

async function requireKetuaOrAdmin() {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");

  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) throw new Error("Tidak terautentikasi");

  return { session, auditRole: isAdmin ? "ADMIN" : "KETUA_KK" as const };
}

function parseTanggalYudisium(raw: unknown): Date | null {
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = new Date(raw.trim());
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof raw === "number") {
    // Excel date serial number (days since 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(epoch.getTime() + raw * 86400000);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function previewGraduateUpdateImport(formData: FormData): Promise<GraduatePreviewResult> {
  await requireKetuaOrAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diunggah");

  const { read, utils } = await import("xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const sheetRows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: GraduatePreviewResult = {
    total: sheetRows.length,
    valid: 0,
    invalid: 0,
    rows: [],
  };

  if (sheetRows.length === 0) return result;

  for (let i = 0; i < sheetRows.length; i++) {
    const rowNum = i + 2;
    const row = sheetRows[i];

    const nim = String(row["NIM"] ?? "").trim();
    const namaInput = String(row["Nama Mahasiswa"] ?? "").trim();
    const kode1Raw = String(row["Kode Pembimbing 1"] ?? "").trim();
    const kode2Raw = String(row["Kode Pembimbing 2"] ?? "").trim();
    const tanggalRaw = row["Tanggal Yudisium"];

    const base = { row: rowNum, nim, namaInput, kodePembimbing1: kode1Raw, kodePembimbing2: kode2Raw };

    if (!nim) {
      result.invalid++;
      result.rows.push({ ...base, tanggalYudisium: "", status: "Invalid", reason: "Kolom NIM wajib diisi" });
      continue;
    }
    if (!kode1Raw) {
      result.invalid++;
      result.rows.push({ ...base, tanggalYudisium: "", status: "Invalid", reason: "Kolom Kode Pembimbing 1 wajib diisi" });
      continue;
    }
    const tanggalYudisium = parseTanggalYudisium(tanggalRaw);
    if (!tanggalYudisium) {
      result.invalid++;
      result.rows.push({ ...base, tanggalYudisium: "", status: "Invalid", reason: "Kolom Tanggal Yudisium wajib diisi dengan tanggal yang valid" });
      continue;
    }

    const mahasiswa = await prisma.user.findFirst({
      where: { role: "MAHASISWA", identifier: nim },
      select: { id: true, name: true },
    });
    if (!mahasiswa) {
      result.invalid++;
      result.rows.push({ ...base, tanggalYudisium: tanggalYudisium.toISOString(), status: "Invalid", reason: "NIM tidak ditemukan" });
      continue;
    }

    const eligibleProposals = await prisma.proposal.findMany({
      where: {
        enrollment: { studentId: mahasiswa.id },
        status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED", "LULUS"] },
      },
      select: {
        id: true,
        status: true,
        supervisor1Assigned: { select: { kodeDosen: true } },
        supervisor2Assigned: { select: { kodeDosen: true } },
      },
    });

    if (eligibleProposals.length === 0) {
      result.invalid++;
      result.rows.push({
        ...base,
        studentName: mahasiswa.name,
        tanggalYudisium: tanggalYudisium.toISOString(),
        status: "Invalid",
        reason: "Mahasiswa tidak memiliki data bimbingan aktif (sudah lulus atau belum ditugaskan)",
      });
      continue;
    }

    const matches = eligibleProposals.filter((p) => {
      const sv1Match = p.supervisor1Assigned?.kodeDosen?.trim().toLowerCase() === kode1Raw.toLowerCase();
      if (!sv1Match) return false;
      if (kode2Raw) {
        return p.supervisor2Assigned?.kodeDosen?.trim().toLowerCase() === kode2Raw.toLowerCase();
      }
      return true;
    });

    if (matches.length === 0) {
      result.invalid++;
      result.rows.push({
        ...base,
        studentName: mahasiswa.name,
        tanggalYudisium: tanggalYudisium.toISOString(),
        status: "Invalid",
        reason: "Kode Pembimbing tidak cocok dengan data assignment aktif mahasiswa",
      });
      continue;
    }

    if (matches.length > 1) {
      result.invalid++;
      result.rows.push({
        ...base,
        studentName: mahasiswa.name,
        tanggalYudisium: tanggalYudisium.toISOString(),
        status: "Invalid",
        reason: "Ditemukan lebih dari satu data bimbingan yang cocok — perlu peninjauan manual",
      });
      continue;
    }

    result.valid++;
    result.rows.push({
      ...base,
      studentName: mahasiswa.name,
      tanggalYudisium: tanggalYudisium.toISOString(),
      status: "Valid",
      proposalId: matches[0].id,
      currentStatus: matches[0].status,
    });
  }

  return result;
}

export async function commitGraduateUpdateImport(rows: GraduatePreviewRow[]): Promise<GraduateCommitResult> {
  const { session, auditRole } = await requireKetuaOrAdmin();

  const importBatchId = randomUUID();

  const result: GraduateCommitResult = {
    total: rows.length,
    graduated: 0,
    skipped: 0,
    failed: 0,
    importBatchId,
    rows: [],
  };

  for (const row of rows) {
    const nama = row.studentName ?? row.namaInput;

    if (row.status !== "Valid" || !row.proposalId) {
      result.skipped++;
      result.rows.push({ row: row.row, nim: row.nim, nama, status: "Skipped", reason: row.reason ?? "Baris tidak valid" });
      continue;
    }

    try {
      const current = await prisma.proposal.findUnique({
        where: { id: row.proposalId },
        select: { status: true },
      });

      if (!current || ["ENROLLED", "PROPOSAL_UPLOADED", "LULUS"].includes(current.status)) {
        result.skipped++;
        result.rows.push({ row: row.row, nim: row.nim, nama, status: "Skipped", reason: "Status berubah sejak preview" });
        continue;
      }

      const tanggalYudisium = new Date(row.tanggalYudisium);

      await prisma.proposal.update({
        where: { id: row.proposalId },
        data: {
          status: "LULUS",
          academicStage: "COMPLETED",
          tanggalYudisium,
          graduatedAt: new Date(),
          graduationImportBatchId: importBatchId,
        },
      });

      result.graduated++;
      result.rows.push({ row: row.row, nim: row.nim, nama, status: "Graduated" });

      await logAudit(
        session.user.id,
        auditRole,
        "GRADUATE_STUDENT",
        {
          nim: row.nim,
          nama,
          proposalId: row.proposalId,
          previousStatus: row.currentStatus,
          newStatus: "LULUS",
          tanggalYudisium: tanggalYudisium.toISOString(),
          importBatchId,
          message: `${auditRole === "ADMIN" ? "Admin" : "Ketua KK"} updated ${row.nim} (${nama}) to LULUS via Graduate Update Import.`,
        },
        "PROPOSAL",
        row.proposalId
      );
    } catch (err: unknown) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Gagal memproses data";
      result.rows.push({ row: row.row, nim: row.nim, nama, status: "Failed", reason: msg });
    }
  }

  await logAudit(
    session.user.id,
    auditRole,
    "GRADUATE_UPDATE_IMPORT",
    {
      total: result.total,
      graduated: result.graduated,
      skipped: result.skipped,
      failed: result.failed,
      importBatchId,
      message: `${auditRole === "ADMIN" ? "Admin" : "Ketua KK"} updated ${result.graduated} students to LULUS using Graduate Update Import.`,
    },
    "CLASS"
  );

  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/update-lulus");
  revalidatePath("/kaprodi/dashboard");
  revalidatePath("/admin/audit-log");

  return result;
}
