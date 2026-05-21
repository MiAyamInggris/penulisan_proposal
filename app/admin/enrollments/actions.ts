"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function enrollStudent(classId: string, studentId: string) {
  const existing = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });

  if (existing) return { error: "Mahasiswa sudah terdaftar di kelas ini" };

  await prisma.classEnrollment.create({ data: { classId, studentId } });
  revalidatePath("/admin/enrollments");
  return { success: true };
}

export async function removeEnrollment(enrollmentId: string) {
  await prisma.classEnrollment.update({
    where: { id: enrollmentId },
    data: { isActive: false },
  });
  revalidatePath("/admin/enrollments");
  return { success: true };
}

// ─── Bulk Enrollment ──────────────────────────────────────────────────────────

export type BulkEnrollResult = {
  total: number;
  accountsCreated: number;
  accountsReused: number;
  enrolled: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; nim?: string; reason: string }>;
};

const VALID_PRODI = new Set(["RPL", "IF", "DS", "SI"]);
const EMAIL_DOMAIN = "student.telkomuniversity.ac.id";

export async function bulkEnrollMahasiswa(
  classId: string,
  formData: FormData
): Promise<BulkEnrollResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Tidak terautentikasi");
  if (!classId) throw new Error("Kelas wajib dipilih");

  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: { program: { select: { code: true } } },
  });
  if (!targetClass) throw new Error("Kelas tidak ditemukan");

  const classProdi = targetClass.program.code as string;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diisi");

  const { read, utils } = await import("xlsx");

  let rows: Record<string, unknown>[];
  const ext = file.name.toLowerCase().split(".").pop();

  if (ext === "csv") {
    const text = await file.text();
    const wb = read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  }

  const result: BulkEnrollResult = {
    total: rows.length,
    accountsCreated: 0,
    accountsReused: 0,
    enrolled: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (rows.length === 0) return result;

  // Pre-load all existing mahasiswa for O(1) lookup
  const existingUsers = await prisma.user.findMany({
    where: { role: "MAHASISWA" },
    select: { id: true, email: true, identifier: true },
  });
  const byEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
  const byNim = new Map(existingUsers.map((u) => [u.identifier.toLowerCase(), u]));

  // Pre-load current enrollments in this class
  const currentEnrollments = await prisma.classEnrollment.findMany({
    where: { classId },
    select: { id: true, studentId: true, isActive: true },
  });
  const enrollmentByStudentId = new Map(currentEnrollments.map((e) => [e.studentId, e]));

  // Within-file duplicate tracking
  const seenNims = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-indexed + skip header
    const row = rows[i];

    // Flexible column name parsing
    const nim = String(
      row["NIM"] ?? row["nim"] ?? row["Nim"] ?? row["No. Mahasiswa"] ?? ""
    ).trim();
    const nama = String(
      row["Nama Mahasiswa"] ?? row["Nama"] ?? row["nama"] ?? row["NAMA"] ?? ""
    ).trim();
    const prodiRaw = String(
      row["Program Studi"] ??
        row["Prodi"] ??
        row["prodi"] ??
        row["program_studi"] ??
        row["PRODI"] ??
        ""
    )
      .trim()
      .toUpperCase();

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
    if (!prodiRaw || !VALID_PRODI.has(prodiRaw)) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        nim,
        reason: `Program Studi '${prodiRaw}' tidak valid. Gunakan: RPL, IF, DS, atau SI`,
      });
      continue;
    }
    // Validate prodi matches target class prodi
    if (prodiRaw !== classProdi) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        nim,
        reason: `Program Studi mahasiswa (${prodiRaw}) tidak sesuai dengan kelas (${classProdi})`,
      });
      continue;
    }
    if (seenNims.has(nim.toLowerCase())) {
      result.skipped++;
      result.errors.push({ row: rowNum, nim, reason: "NIM duplikat dalam file" });
      continue;
    }

    seenNims.add(nim.toLowerCase());

    const email = `${nim}@${EMAIL_DOMAIN}`;

    try {
      let userId: string;

      // Resolve user: check by NIM first, then by generated email
      const existByNim = byNim.get(nim.toLowerCase());
      const existByEmail = byEmail.get(email.toLowerCase());
      const existingUser = existByNim ?? existByEmail;

      if (existingUser) {
        userId = existingUser.id;
        result.accountsReused++;
      } else {
        const hashed = await bcrypt.hash(nim, 10);
        const newUser = await prisma.user.create({
          data: { name: nama, email, password: hashed, role: "MAHASISWA", identifier: nim },
          select: { id: true },
        });
        userId = newUser.id;
        byNim.set(nim.toLowerCase(), { id: userId, email, identifier: nim });
        byEmail.set(email.toLowerCase(), { id: userId, email, identifier: nim });
        result.accountsCreated++;
      }

      // Enroll in class
      const existingEnrollment = enrollmentByStudentId.get(userId);

      if (existingEnrollment) {
        if (existingEnrollment.isActive) {
          result.skipped++;
          result.errors.push({
            row: rowNum,
            nim,
            reason: "Mahasiswa sudah terdaftar di kelas ini",
          });
          continue;
        }
        // Reactivate soft-deleted enrollment
        await prisma.classEnrollment.update({
          where: { id: existingEnrollment.id },
          data: { isActive: true },
        });
      } else {
        await prisma.classEnrollment.create({ data: { classId, studentId: userId } });
        enrollmentByStudentId.set(userId, { id: "new", studentId: userId, isActive: true });
      }

      result.enrolled++;
    } catch (err: unknown) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Gagal memproses data";
      result.errors.push({ row: rowNum, nim, reason: msg });
    }
  }

  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/users");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  return result;
}
