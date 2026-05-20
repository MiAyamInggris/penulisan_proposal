"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";

// ─── Types shared with import-dialog.tsx ─────────────────────────────────────
export type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; nim?: string; email?: string; reason: string }>;
};

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  identifier: z.string().min(1),
});

export async function createUser(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as Role,
    identifier: formData.get("identifier") as string,
  };

  const parsed = userSchema.safeParse(data);
  if (!parsed.success) return { error: "Data tidak valid" };

  const hashed = await bcrypt.hash(data.password!, 10);

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      identifier: data.identifier,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    role: formData.get("role") as Role,
    identifier: formData.get("identifier") as string,
  };

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    role: data.role,
    identifier: data.identifier,
  };

  const newPassword = formData.get("password") as string;
  if (newPassword && newPassword.length >= 6) {
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({ where: { id }, data: updateData });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function importMahasiswa(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diisi");

  const { read, utils } = await import("xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, failed: 0, errors: [] };

  // Pre-load existing emails and identifiers for O(1) duplicate checks
  const existing = await prisma.user.findMany({ select: { email: true, identifier: true } });
  const dbEmails = new Set(existing.map((u: { email: string; identifier: string }) => u.email.toLowerCase()));
  const dbNims = new Set(existing.map((u: { email: string; identifier: string }) => u.identifier.toLowerCase()));

  // Track within-file duplicates
  const seenEmails = new Set<string>();
  const seenNims = new Set<string>();

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 1-indexing, +1 for header row
    const row = rows[i];

    const nama = String(row["nama"] ?? row["Nama"] ?? "").trim();
    const email = String(row["email"] ?? row["Email"] ?? "").trim().toLowerCase();
    const nim = String(row["nim"] ?? row["NIM"] ?? row["Nim"] ?? "").trim();

    if (!nama) {
      result.failed++;
      result.errors.push({ row: rowNum, reason: "Kolom 'nama' wajib diisi" });
      continue;
    }
    if (!email) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, reason: "Kolom 'email' wajib diisi" });
      continue;
    }
    if (!nim) {
      result.failed++;
      result.errors.push({ row: rowNum, email, reason: "Kolom 'nim' wajib diisi" });
      continue;
    }
    if (!emailRe.test(email)) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, email, reason: "Format email tidak valid" });
      continue;
    }

    if (dbEmails.has(email) || seenEmails.has(email)) {
      result.skipped++;
      result.errors.push({ row: rowNum, nim, email, reason: "Email sudah terdaftar" });
      continue;
    }
    if (dbNims.has(nim.toLowerCase()) || seenNims.has(nim.toLowerCase())) {
      result.skipped++;
      result.errors.push({ row: rowNum, nim, email, reason: "NIM sudah terdaftar" });
      continue;
    }

    seenEmails.add(email);
    seenNims.add(nim.toLowerCase());

    try {
      await prisma.user.create({
        data: {
          name: nama,
          email,
          password: await bcrypt.hash(nim, 10),
          role: "MAHASISWA",
          identifier: nim,
        },
      });
      dbEmails.add(email);
      dbNims.add(nim.toLowerCase());
      result.imported++;
    } catch (err: any) {
      result.failed++;
      result.errors.push({ row: rowNum, nim, email, reason: err?.message ?? "Gagal membuat akun" });
    }
  }

  revalidatePath("/admin/users");
  return result;
}
