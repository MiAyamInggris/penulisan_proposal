"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, type AssignmentChange } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { ProdiCode, SidangWarningType } from "@prisma/client";

export type SidangImportAction = "CREATE" | "UPDATE" | "SKIP_NO_CHANGE";

const HIGH_WORKLOAD_THRESHOLD = 10;

export type SidangPreviewRow = {
  row: number;
  nim: string;
  nama: string;
  prodi: ProdiCode | null;
  judul: string;
  semester: string;
  kodeKelompokKeahlian: string;
  kelompokKeahlianId: string | null;
  kelompokKeahlianNama: string | null;
  kodePembimbing1: string;
  kodePembimbing2: string;
  kodePenguji1: string;
  kodePenguji2: string;
  pembimbing1Id: string | null;
  pembimbing2Id: string | null;
  penguji1Id: string | null;
  penguji2Id: string | null;
  existingPenguji1Id: string | null;
  existingPenguji2Id: string | null;
  existingSidangRecordId: string | null;
  status: "Valid" | "Invalid" | "Warning";
  warningType: SidangWarningType | null;
  issues: string[];
  action: SidangImportAction;
  changes: AssignmentChange[];
};

export type SidangPreviewResult = {
  rows: SidangPreviewRow[];
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  willCreate: number;
  willUpdate: number;
  willSkipNoChange: number;
};

export type SidangCommitRowStatus = "Created" | "Updated" | "SkippedNoChange" | "SkippedInvalid" | "Failed" | "Queued";

export type SidangCommitResult = {
  total: number;
  created: number;
  updated: number;
  skippedNoChange: number;
  skippedInvalid: number;
  failed: number;
  warningQueued: number;
  importBatchId: string;
  rows: { row: number; nim: string; status: SidangCommitRowStatus; reason?: string }[];
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

type ExistingSidang = {
  prodi: ProdiCode;
  judul: string | null;
  semester: string | null;
  kelompokKeahlianId: string;
  pembimbing1Id: string | null;
  pembimbing2Id: string | null;
  penguji1Id: string | null;
  penguji2Id: string | null;
};

function diffSidangRow(
  existing: ExistingSidang,
  row: {
    prodi: ProdiCode | null;
    judul: string;
    semester: string;
    kelompokKeahlianId: string | null;
    pembimbing1Id: string | null;
    pembimbing2Id: string | null;
    penguji1Id: string | null;
    penguji2Id: string | null;
  },
  method: "full" | "semi",
  kodeById: Map<string, string>,
  kkNameById: Map<string, string>
): AssignmentChange[] {
  const changes: AssignmentChange[] = [];
  const label = (id: string | null) => (id ? kodeById.get(id) ?? id : "—");
  const kkLabel = (id: string | null) => (id ? kkNameById.get(id) ?? id : "—");

  if (existing.prodi !== row.prodi) {
    changes.push({ field: "Program Studi", previous: existing.prodi, new: row.prodi ?? "—" });
  }
  if ((existing.judul ?? "") !== row.judul) {
    changes.push({ field: "Judul", previous: existing.judul ?? "—", new: row.judul || "—" });
  }
  if (existing.kelompokKeahlianId !== row.kelompokKeahlianId) {
    changes.push({ field: "Kelompok Keahlian", previous: kkLabel(existing.kelompokKeahlianId), new: kkLabel(row.kelompokKeahlianId) });
  }
  if ((existing.semester ?? "") !== row.semester) {
    changes.push({ field: "Semester", previous: existing.semester ?? "—", new: row.semester || "—" });
  }
  if (existing.pembimbing1Id !== row.pembimbing1Id) {
    changes.push({ field: "Pembimbing 1 (PBB I)", previous: label(existing.pembimbing1Id), new: label(row.pembimbing1Id) });
  }
  if (existing.pembimbing2Id !== row.pembimbing2Id) {
    changes.push({ field: "Pembimbing 2 (PBB II)", previous: label(existing.pembimbing2Id), new: label(row.pembimbing2Id) });
  }
  if (method === "full") {
    if (existing.penguji1Id !== row.penguji1Id) {
      changes.push({ field: "Penguji 1 (PGJ I)", previous: label(existing.penguji1Id), new: label(row.penguji1Id) });
    }
    if (existing.penguji2Id !== row.penguji2Id) {
      changes.push({ field: "Penguji 2 (PGJ II)", previous: label(existing.penguji2Id), new: label(row.penguji2Id) });
    }
  }
  return changes;
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
    willCreate: 0,
    willUpdate: 0,
    willSkipNoChange: 0,
  };

  if (sheetRows.length === 0) return result;

  // Pre-load all active dosen indexed by kodeDosen (lowercase), plus reverse id→kode lookup
  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true, kodeDosen: { not: null } },
    select: { id: true, name: true, kodeDosen: true, kelompokKeahlianId: true },
  });
  const dosenByKode = new Map<string, { id: string; name: string; kelompokKeahlianId: string | null }>();
  const kodeById = new Map<string, string>();
  for (const d of allDosen) {
    if (d.kodeDosen) {
      dosenByKode.set(d.kodeDosen.toLowerCase(), { id: d.id, name: d.name, kelompokKeahlianId: d.kelompokKeahlianId });
      kodeById.set(d.id, d.kodeDosen);
    }
  }

  // Pre-load Kelompok Keahlian for mandatory matching (by exact name, case-insensitive)
  const kkList = await prisma.kelompokKeahlian.findMany({ select: { id: true, nama: true } });
  const kkByName = new Map(kkList.map((k) => [k.nama.toLowerCase().trim(), k]));
  const kkNameById = new Map(kkList.map((k) => [k.id, k.nama]));

  // Pre-load existing SidangRecords for matching (NIM priority 1, Nama priority 2)
  const existingRecords = await prisma.sidangRecord.findMany({
    select: {
      id: true, nim: true, nama: true, prodi: true, judul: true, semester: true, kelompokKeahlianId: true,
      pembimbing1Id: true, pembimbing2Id: true, penguji1Id: true, penguji2Id: true,
    },
  });
  const existingByNim = new Map(existingRecords.map((r) => [r.nim.toLowerCase(), r]));
  const existingByNama = new Map<string, string>(); // nama(lower) -> nim
  for (const r of existingRecords) {
    existingByNama.set(r.nama.toLowerCase().trim(), r.nim);
  }

  // Running workload tally (Pembimbing + Penguji slots) — seeded from existing data,
  // incremented as rows within this same file assign the same dosen again.
  const runningBeban = new Map<string, number>();
  for (const r of existingRecords) {
    for (const id of [r.pembimbing1Id, r.pembimbing2Id, r.penguji1Id, r.penguji2Id]) {
      if (id) runningBeban.set(id, (runningBeban.get(id) ?? 0) + 1);
    }
  }
  const bumpBeban = (id: string) => runningBeban.set(id, (runningBeban.get(id) ?? 0) + 1);

  for (let i = 0; i < sheetRows.length; i++) {
    const rowNum = i + 2;
    const row = sheetRows[i];

    const nim = String(row["NIM"] ?? "").trim();
    const nama = String(row["Nama Mahasiswa"] ?? "").trim();
    const prodiRaw = String(row["Program Studi"] ?? "").trim().toUpperCase();
    const judul = String(row["Judul"] ?? "").trim();
    const semester = String(row["Semester"] ?? "").trim();
    const kodeKelompokKeahlian = String(row["Kelompok Keahlian"] ?? "").trim();
    const kodePembimbing1 = String(row["Kode Pembimbing 1"] ?? "").trim();
    const kodePembimbing2 = String(row["Kode Pembimbing 2"] ?? "").trim();
    const kodePenguji1 = method === "full" ? String(row["Kode Penguji 1"] ?? "").trim() : "";
    const kodePenguji2 = method === "full" ? String(row["Kode Penguji 2"] ?? "").trim() : "";

    // ── Hard validation (blocks the row entirely) ──────────────────────────
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

    const kk = kodeKelompokKeahlian ? (kkByName.get(kodeKelompokKeahlian.toLowerCase()) ?? null) : null;
    if (!kodeKelompokKeahlian) {
      issues.push("Kolom Kelompok Keahlian wajib diisi");
    } else if (!kk) {
      issues.push(`Kelompok Keahlian "${kodeKelompokKeahlian}" tidak ditemukan — gunakan nama KK yang sesuai`);
    }

    const pembimbing1 = kodePembimbing1 ? (dosenByKode.get(kodePembimbing1.toLowerCase()) ?? null) : null;
    const pembimbing2 = kodePembimbing2 ? (dosenByKode.get(kodePembimbing2.toLowerCase()) ?? null) : null;
    if (kodePembimbing1 && !pembimbing1) issues.push(`Kode Pembimbing 1 "${kodePembimbing1}" tidak ditemukan`);
    if (kodePembimbing2 && !pembimbing2) issues.push(`Kode Pembimbing 2 "${kodePembimbing2}" tidak ditemukan`);

    // ── Soft validation (Penguji code unresolved → Warning, not Invalid,
    //    as long as mahasiswa/pembimbing core data above is otherwise fine) ──
    const warningMsgs: string[] = [];
    let warningType: SidangWarningType | null = null;
    const setWarning = (type: SidangWarningType, msg: string) => {
      warningMsgs.push(msg);
      if (!warningType) warningType = type;
    };

    const penguji1 = kodePenguji1 ? (dosenByKode.get(kodePenguji1.toLowerCase()) ?? null) : null;
    const penguji2 = kodePenguji2 ? (dosenByKode.get(kodePenguji2.toLowerCase()) ?? null) : null;

    if (kodePenguji1 && !penguji1) setWarning("UNRECOGNIZED_DOSEN_CODE", `Kode Penguji 1 "${kodePenguji1}" tidak ditemukan — pilih penguji secara manual`);
    if (kodePenguji2 && !penguji2) setWarning("UNRECOGNIZED_DOSEN_CODE", `Kode Penguji 2 "${kodePenguji2}" tidak ditemukan — pilih penguji secara manual`);

    if (method === "full" && penguji1 && penguji2 && penguji1.id === penguji2.id) {
      issues.push("Penguji 1 dan Penguji 2 tidak boleh sama");
    }

    // Mahasiswa matching: Priority 1 = NIM, Priority 2 = Nama (informational only)
    const existing = nim ? existingByNim.get(nim.toLowerCase()) : undefined;
    if (!existing && nim && nama) {
      const nameMatchNim = existingByNama.get(nama.toLowerCase().trim());
      if (nameMatchNim && nameMatchNim.toLowerCase() !== nim.toLowerCase()) {
        warningMsgs.push(`Nama "${nama}" cocok dengan data lain bernama sama dengan NIM berbeda (${nameMatchNim}) — periksa kemungkinan duplikat/kesalahan NIM`);
      }
    }

    if (issues.length === 0 && kk) {
      const pembimbingIds = new Set([pembimbing1?.id, pembimbing2?.id].filter(Boolean));

      // Penguji juga merupakan pembimbing → conflict, treated as duplicate involvement
      if (penguji1 && pembimbingIds.has(penguji1.id)) setWarning("DUPLICATE_EXAMINER", `Penguji 1 (${penguji1.name}) juga merupakan pembimbing mahasiswa ini`);
      if (penguji2 && pembimbingIds.has(penguji2.id)) setWarning("DUPLICATE_EXAMINER", `Penguji 2 (${penguji2.name}) juga merupakan pembimbing mahasiswa ini`);

      if (existing) {
        // Existing assignment would be overwritten with a different penguji
        if (penguji1 && existing.penguji1Id && existing.penguji1Id !== penguji1.id) {
          const prevName = kodeById.get(existing.penguji1Id) ?? existing.penguji1Id;
          setWarning("EXISTING_PENGUJI_DIFFERENT", `Penguji 1 sudah ada (${prevName}) dan akan diganti dengan ${penguji1.name}`);
        }
        if (penguji2 && existing.penguji2Id && existing.penguji2Id !== penguji2.id) {
          const prevName = kodeById.get(existing.penguji2Id) ?? existing.penguji2Id;
          setWarning("EXISTING_PENGUJI_DIFFERENT", `Penguji 2 sudah ada (${prevName}) dan akan diganti dengan ${penguji2.name}`);
        }
        // Cross-slot duplicate: imported penguji matches the OTHER existing slot
        if (penguji1 && existing.penguji2Id === penguji1.id) {
          setWarning("DUPLICATE_EXAMINER", `${penguji1.name} sudah tercatat sebagai Penguji 2 — kemungkinan duplikat/tertukar slot`);
        }
        if (penguji2 && existing.penguji1Id === penguji2.id) {
          setWarning("DUPLICATE_EXAMINER", `${penguji2.name} sudah tercatat sebagai Penguji 1 — kemungkinan duplikat/tertukar slot`);
        }
      }

      // Cross-KK penguji
      if (penguji1 && penguji1.kelompokKeahlianId && penguji1.kelompokKeahlianId !== kk.id) {
        setWarning("CROSS_KK_PENGUJI", `Penguji 1 (${penguji1.name}) berasal dari KK lain`);
      }
      if (penguji2 && penguji2.kelompokKeahlianId && penguji2.kelompokKeahlianId !== kk.id) {
        setWarning("CROSS_KK_PENGUJI", `Penguji 2 (${penguji2.name}) berasal dari KK lain`);
      }

      // High workload
      if (penguji1) {
        const projected = (runningBeban.get(penguji1.id) ?? 0) + 1;
        if (projected > HIGH_WORKLOAD_THRESHOLD) setWarning("HIGH_WORKLOAD", `Beban dosen ${penguji1.name} akan mencapai ${projected} (di atas ambang ${HIGH_WORKLOAD_THRESHOLD})`);
        bumpBeban(penguji1.id);
      }
      if (penguji2) {
        const projected = (runningBeban.get(penguji2.id) ?? 0) + 1;
        if (projected > HIGH_WORKLOAD_THRESHOLD) setWarning("HIGH_WORKLOAD", `Beban dosen ${penguji2.name} akan mencapai ${projected} (di atas ambang ${HIGH_WORKLOAD_THRESHOLD})`);
        bumpBeban(penguji2.id);
      }
      if (pembimbing1) bumpBeban(pembimbing1.id);
      if (pembimbing2) bumpBeban(pembimbing2.id);
    }

    const allIssues = [...issues, ...warningMsgs];
    let status: "Valid" | "Invalid" | "Warning";
    if (issues.length > 0) {
      status = "Invalid";
      result.invalid++;
    } else if (warningType) {
      status = "Warning";
      result.warnings++;
    } else {
      status = "Valid";
      result.valid++;
    }

    const rowData = {
      prodi,
      judul,
      semester,
      kelompokKeahlianId: kk?.id ?? null,
      pembimbing1Id: pembimbing1?.id ?? null,
      pembimbing2Id: pembimbing2?.id ?? null,
      penguji1Id: penguji1?.id ?? null,
      penguji2Id: penguji2?.id ?? null,
    };

    let action: SidangImportAction = "CREATE";
    let changes: AssignmentChange[] = [];

    if (issues.length === 0) {
      if (existing) {
        changes = diffSidangRow(existing, rowData, method, kodeById, kkNameById);
        action = changes.length === 0 ? "SKIP_NO_CHANGE" : "UPDATE";
      } else {
        action = "CREATE";
      }

      if (status !== "Warning") {
        if (action === "CREATE") result.willCreate++;
        else if (action === "UPDATE") result.willUpdate++;
        else result.willSkipNoChange++;
      }
    }

    result.rows.push({
      row: rowNum,
      nim,
      nama,
      prodi,
      judul,
      semester,
      kodeKelompokKeahlian,
      kelompokKeahlianId: kk?.id ?? null,
      kelompokKeahlianNama: kk?.nama ?? null,
      kodePembimbing1,
      kodePembimbing2,
      kodePenguji1,
      kodePenguji2,
      pembimbing1Id: pembimbing1?.id ?? null,
      pembimbing2Id: pembimbing2?.id ?? null,
      penguji1Id: penguji1?.id ?? null,
      penguji2Id: penguji2?.id ?? null,
      existingPenguji1Id: existing?.penguji1Id ?? null,
      existingPenguji2Id: existing?.penguji2Id ?? null,
      existingSidangRecordId: existing?.id ?? null,
      status,
      warningType,
      issues: allIssues,
      action,
      changes,
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
    skippedNoChange: 0,
    skippedInvalid: 0,
    failed: 0,
    warningQueued: 0,
    importBatchId,
    rows: [],
  };

  // Reverse id→kode lookup for audit messages
  const allDosen = await prisma.user.findMany({
    where: { role: "DOSEN" },
    select: { id: true, kodeDosen: true },
  });
  const kodeById = new Map(allDosen.filter((d) => d.kodeDosen).map((d) => [d.id, d.kodeDosen!]));
  const kkList = await prisma.kelompokKeahlian.findMany({ select: { id: true, nama: true } });
  const kkNameById = new Map(kkList.map((k) => [k.id, k.nama]));

  for (const row of rows) {
    if (row.status === "Invalid") {
      result.skippedInvalid++;
      result.rows.push({ row: row.row, nim: row.nim, status: "SkippedInvalid", reason: row.issues.join("; ") });
      continue;
    }
    if (!row.prodi || !row.pembimbing1Id || !row.kelompokKeahlianId) {
      result.skippedInvalid++;
      result.rows.push({ row: row.row, nim: row.nim, status: "SkippedInvalid", reason: "Data tidak lengkap" });
      continue;
    }

    // Warning rows are diverted to the Data Warning & Confirmation queue —
    // never written directly to SidangRecord (spec 1010-1012, 1049-1051).
    if (row.status === "Warning") {
      try {
        await prisma.sidangImportWarning.create({
          data: {
            importBatchId,
            row: row.row,
            nim: row.nim,
            nama: row.nama,
            prodi: row.prodi,
            judul: row.judul || null,
            kelompokKeahlianId: row.kelompokKeahlianId,
            semester: row.semester || null,
            method,
            pembimbing1Id: row.pembimbing1Id,
            pembimbing2Id: row.pembimbing2Id ?? null,
            importedPenguji1Id: row.penguji1Id ?? null,
            importedPenguji2Id: row.penguji2Id ?? null,
            existingPenguji1Id: row.existingPenguji1Id ?? null,
            existingPenguji2Id: row.existingPenguji2Id ?? null,
            existingSidangRecordId: row.existingSidangRecordId ?? null,
            warningType: row.warningType!,
            warningMessages: row.issues,
            importedById: session.user.id,
          },
        });

        result.warningQueued++;
        result.rows.push({ row: row.row, nim: row.nim, status: "Queued", reason: row.issues.join("; ") });
      } catch (err: unknown) {
        result.failed++;
        const msg = err instanceof Error ? err.message : "Gagal memproses data";
        result.rows.push({ row: row.row, nim: row.nim, status: "Failed", reason: msg });
      }
      continue;
    }

    try {
      const existing = await prisma.sidangRecord.findUnique({
        where: { nim: row.nim },
        select: {
          id: true, prodi: true, judul: true, semester: true, kelompokKeahlianId: true,
          pembimbing1Id: true, pembimbing2Id: true, penguji1Id: true, penguji2Id: true,
        },
      });

      const rowData = {
        prodi: row.prodi,
        judul: row.judul,
        semester: row.semester,
        kelompokKeahlianId: row.kelompokKeahlianId,
        pembimbing1Id: row.pembimbing1Id,
        pembimbing2Id: row.pembimbing2Id,
        penguji1Id: row.penguji1Id,
        penguji2Id: row.penguji2Id,
      };

      if (existing) {
        const changes = diffSidangRow(existing, rowData, method, kodeById, kkNameById);
        if (changes.length === 0) {
          result.skippedNoChange++;
          result.rows.push({ row: row.row, nim: row.nim, status: "SkippedNoChange" });
          continue;
        }

        await prisma.sidangRecord.update({
          where: { nim: row.nim },
          data: {
            nama: row.nama,
            prodi: row.prodi,
            judul: row.judul || null,
            semester: row.semester || null,
            kelompokKeahlianId: row.kelompokKeahlianId,
            pembimbing1Id: row.pembimbing1Id,
            pembimbing2Id: row.pembimbing2Id ?? null,
            ...(method === "full" ? { penguji1Id: row.penguji1Id ?? null, penguji2Id: row.penguji2Id ?? null } : {}),
            importBatchId,
            importedById: session.user.id,
          },
        });

        result.updated++;
        result.rows.push({ row: row.row, nim: row.nim, status: "Updated", reason: changes.map((c) => `${c.field}: ${c.previous} → ${c.new}`).join("; ") });

        await logAudit(
          session.user.id,
          auditRole,
          "ASSIGNMENT_UPDATED",
          {
            source: "PLOTTING_PENGUJI",
            nim: row.nim,
            nama: row.nama,
            kelompokKeahlian: row.kelompokKeahlianNama,
            changes,
            message: changes.map((c) => `${c.field}: ${c.previous} → ${c.new}`).join("; "),
          },
          "SIDANG_RECORD",
          existing.id
        );
      } else {
        await prisma.sidangRecord.create({
          data: {
            nim: row.nim,
            nama: row.nama,
            prodi: row.prodi,
            judul: row.judul || null,
            semester: row.semester || null,
            kelompokKeahlianId: row.kelompokKeahlianId,
            pembimbing1Id: row.pembimbing1Id,
            pembimbing2Id: row.pembimbing2Id ?? null,
            penguji1Id: method === "full" ? (row.penguji1Id ?? null) : null,
            penguji2Id: method === "full" ? (row.penguji2Id ?? null) : null,
            importBatchId,
            importedById: session.user.id,
          },
        });

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
      skippedNoChange: result.skippedNoChange,
      skippedInvalid: result.skippedInvalid,
      failed: result.failed,
      warningQueued: result.warningQueued,
      importBatchId,
      message: `${auditRole === "ADMIN" ? "Admin" : "Ketua KK"} imported ${result.created} new and updated ${result.updated} sidang records via Metode ${method === "full" ? "1" : "2"}; ${result.warningQueued} dikirim ke Data Warning & Confirmation.`,
    },
    "SIDANG_RECORD"
  );

  revalidatePath("/ketua-kk/plotting-penguji");
  revalidatePath("/ketua-kk/plotting-penguji/beban-dosen");
  revalidatePath("/ketua-kk/plotting-penguji/data-warning");
  revalidatePath("/admin/audit-log");

  return result;
}
