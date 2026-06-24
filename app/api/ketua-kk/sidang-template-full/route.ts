import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isKetua = session?.user.role === "DOSEN" && !!session.user.isKetua;
  if (!session || (!isAdmin && !isKetua)) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const kkList = await prisma.kelompokKeahlian.findMany({ orderBy: { nama: "asc" }, select: { nama: true } });
  const firstKK = kkList[0]?.nama ?? "Applied Artificial Intelligence";
  const secondKK = kkList[1]?.nama ?? firstKK;

  const dataRows = [
    {
      NIM: "6701180001",
      "Nama Mahasiswa": "Ahmad Fauzi",
      "Program Studi": "RPL",
      "Judul": "Sistem Informasi Manajemen",
      "Kelompok Keahlian": firstKK,
      "Kode Pembimbing 1": "AAP",
      "Kode Pembimbing 2": "BBR",
      "Kode Penguji 1": "CCS",
      "Kode Penguji 2": "DDT",
      "Semester": "Ganjil 2024/2025",
    },
    {
      NIM: "6701180002",
      "Nama Mahasiswa": "Dewi Lestari",
      "Program Studi": "IF",
      "Judul": "Sistem Pakar Diagnosa Penyakit",
      "Kelompok Keahlian": secondKK,
      "Kode Pembimbing 1": "EEU",
      "Kode Pembimbing 2": "",
      "Kode Penguji 1": "FFV",
      "Kode Penguji 2": "GGW",
      "Semester": "Ganjil 2024/2025",
    },
  ];

  const infoRows = [
    { Keterangan: "=== PETUNJUK — IMPORT PLOTTING PENGUJI (METODE 1 — LENGKAP) ===" },
    { Keterangan: "" },
    { Keterangan: "Gunakan template ini untuk mengimpor data sidang LENGKAP:" },
    { Keterangan: "  - Data pembimbing (PBB I dan PBB II)" },
    { Keterangan: "  - Data penguji (PGJ I dan PGJ II)" },
    { Keterangan: "" },
    { Keterangan: "KOLOM WAJIB:" },
    { Keterangan: "  NIM — Nomor Induk Mahasiswa (unik, akan diperbarui jika sudah ada)" },
    { Keterangan: "  Nama Mahasiswa — Nama lengkap mahasiswa" },
    { Keterangan: "  Program Studi — Kode prodi: RPL, IF, DS, atau SI" },
    { Keterangan: "  Kelompok Keahlian — harus sama persis dengan nama KK terdaftar (lihat daftar di bawah)" },
    { Keterangan: "  Kode Pembimbing 1 — Kode dosen pembimbing utama" },
    { Keterangan: "  Kode Penguji 1 — Kode dosen penguji 1" },
    { Keterangan: "  Kode Penguji 2 — Kode dosen penguji 2" },
    { Keterangan: "" },
    { Keterangan: "KOLOM OPSIONAL:" },
    { Keterangan: "  Judul — Judul tugas akhir/sidang" },
    { Keterangan: "  Kode Pembimbing 2 — Kode dosen pembimbing 2" },
    { Keterangan: "  Semester — contoh: Ganjil 2024/2025" },
    { Keterangan: "" },
    { Keterangan: "VALIDASI:" },
    { Keterangan: "  - Kelompok Keahlian WAJIB diisi dan harus cocok dengan salah satu nama di daftar berikut" },
    { Keterangan: "  - Penguji 1 tidak boleh sama dengan Penguji 2" },
    { Keterangan: "  - Kode dosen harus terdaftar dan aktif di sistem" },
    { Keterangan: "  - Jika Penguji sama dengan Pembimbing: sistem akan memberi peringatan" },
    { Keterangan: "    tetapi data tetap dapat dikonfirmasi" },
    { Keterangan: "  - NIM yang sudah ada akan diperbarui (hanya field yang berubah)" },
    { Keterangan: "  - Jangan ubah nama kolom pada sheet 'Template'" },
    { Keterangan: "" },
    { Keterangan: "DAFTAR KELOMPOK KEAHLIAN TERDAFTAR:" },
    ...kkList.map((k) => ({ Keterangan: `  - ${k.nama}` })),
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 40 },
    { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-plotting-penguji-lengkap.xlsx"',
    },
  });
}
