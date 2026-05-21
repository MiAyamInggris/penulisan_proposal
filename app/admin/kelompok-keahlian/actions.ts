"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function requireAdmin() {
  return auth().then((s) => {
    if (s?.user?.role !== "ADMIN") throw new Error("Hanya Admin yang dapat melakukan aksi ini");
  });
}

function revalidateAll() {
  revalidatePath("/admin/kelompok-keahlian");
  revalidatePath("/admin/ketua-kk");
  revalidatePath("/admin/users");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  revalidatePath("/ketua-kk/kuota");
}

// ─── KK CRUD ─────────────────────────────────────────────────────────────────

export async function createKelompokKeahlian(nama: string) {
  await requireAdmin();
  const trimmed = nama.trim();
  if (!trimmed) return { error: "Nama wajib diisi" };

  await prisma.kelompokKeahlian.create({ data: { nama: trimmed } });
  revalidateAll();
  return { success: true };
}

export async function updateKKNama(kkId: string, nama: string) {
  await requireAdmin();
  const trimmed = nama.trim();
  if (!trimmed) return { error: "Nama wajib diisi" };

  await prisma.kelompokKeahlian.update({ where: { id: kkId }, data: { nama: trimmed } });
  revalidateAll();
  return { success: true };
}

export async function deleteKK(kkId: string) {
  await requireAdmin();

  const kk = await prisma.kelompokKeahlian.findUnique({
    where: { id: kkId },
    select: { ketuaId: true, dosen: { select: { id: true } } },
  });
  if (!kk) return { error: "KK tidak ditemukan" };
  if (kk.dosen.length > 0)
    return { error: "Hapus semua anggota terlebih dahulu sebelum menghapus KK" };

  await prisma.kelompokKeahlian.delete({ where: { id: kkId } });
  revalidateAll();
  return { success: true };
}

// ─── Dosen Assignment ─────────────────────────────────────────────────────────

export async function assignDosenToKK(dosenId: string, kkId: string) {
  await requireAdmin();

  const dosen = await prisma.user.findUnique({
    where: { id: dosenId },
    select: { role: true, kelompokKeahlianId: true, isKetua: true },
  });
  if (!dosen || dosen.role !== "DOSEN") return { error: "Dosen tidak ditemukan" };

  // If currently ketua of a different KK, clear that ketua relationship first
  if (dosen.isKetua && dosen.kelompokKeahlianId && dosen.kelompokKeahlianId !== kkId) {
    await prisma.kelompokKeahlian.update({
      where: { id: dosen.kelompokKeahlianId },
      data: { ketuaId: null },
    });
    await prisma.user.update({ where: { id: dosenId }, data: { isKetua: false } });
  }

  await prisma.user.update({ where: { id: dosenId }, data: { kelompokKeahlianId: kkId } });
  revalidateAll();
  return { success: true };
}

export async function removeDosenFromKK(dosenId: string) {
  await requireAdmin();

  const dosen = await prisma.user.findUnique({
    where: { id: dosenId },
    select: { isKetua: true, kelompokKeahlianId: true },
  });
  if (!dosen || !dosen.kelompokKeahlianId) return { error: "Dosen tidak dalam KK manapun" };

  // If this dosen is ketua of their KK, clear the ketuaId first
  if (dosen.isKetua) {
    await prisma.kelompokKeahlian.update({
      where: { id: dosen.kelompokKeahlianId },
      data: { ketuaId: null },
    });
  }

  await prisma.user.update({
    where: { id: dosenId },
    data: { kelompokKeahlianId: null, isKetua: false },
  });
  revalidateAll();
  return { success: true };
}

// ─── Ketua Assignment ─────────────────────────────────────────────────────────

export async function setKetuaKK(kkId: string, dosenId: string | null) {
  await requireAdmin();

  const kk = await prisma.kelompokKeahlian.findUnique({
    where: { id: kkId },
    select: { ketuaId: true },
  });
  if (!kk) return { error: "KK tidak ditemukan" };

  // Validate: new ketua must be a member of this KK
  if (dosenId) {
    const dosen = await prisma.user.findUnique({
      where: { id: dosenId },
      select: { role: true, kelompokKeahlianId: true },
    });
    if (!dosen || dosen.role !== "DOSEN")
      return { error: "Dosen tidak ditemukan" };
    if (dosen.kelompokKeahlianId !== kkId)
      return { error: "Ketua KK harus merupakan anggota KK ini" };
  }

  // Clear old ketua's isKetua flag
  if (kk.ketuaId && kk.ketuaId !== dosenId) {
    await prisma.user.update({ where: { id: kk.ketuaId }, data: { isKetua: false } });
  }

  // Set new ketua
  await prisma.kelompokKeahlian.update({ where: { id: kkId }, data: { ketuaId: dosenId } });
  if (dosenId) {
    await prisma.user.update({ where: { id: dosenId }, data: { isKetua: true } });
  }

  revalidateAll();
  return { success: true };
}
