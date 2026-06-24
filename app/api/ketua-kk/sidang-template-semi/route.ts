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
      "Semester": "Ganjil 2024/2025",
    },
  ];

  const infoRows = [
    { Keterangan: "=== PETUNJUK — IMPORT PLOTTING PENGUJI (METODE 2 — SEMI-OTOMATIS) ===" },
    { Keterangan: "" },
    { Keterangan: "Gunakan template ini untuk mengimpor data pembimbing tanpa penguji." },
    { Keterangan: "Penguji (PGJ I dan PGJ II) akan ditugaskan secara manual setelah import." },
    { Keterangan: "" },
    { Keterangan: "KOLOM WAJIB:" },
    { Keterangan: "  NIM — Nomor Induk Mahasiswa (unik, akan diperbarui jika sudah ada)" },
    { Keterangan: "  Nama Mahasiswa — Nama lengkap mahasiswa" },
    { Keterangan: "  Program Studi — Kode prodi: RPL, IF, DS, atau SI" },
    { Keterangan: "  Kelompok Keahlian — harus sama persis dengan nama KK terdaftar (lihat daftar di bawah)" },
    { Keterangan: "  Kode Pembimbing 1 — Kode dosen pembimbing utama" },
    { Keterangan: "" },
    { Keterangan: "KOLOM OPSIONAL:" },
    { Keterangan: "  Judul — Judul tugas akhir/sidang" },
    { Keterangan: "  Kode Pembimbing 2 — Kode dosen pembimbing 2" },
    { Keterangan: "  Semester — contoh: Ganjil 2024/2025" },
    { Keterangan: "" },
    { Keterangan: "SETELAH IMPORT:" },
    { Keterangan: "  Buka tab 'Belum Memiliki Penguji' untuk menugaskan Penguji 1 dan 2 secara manual." },
    { Keterangan: "" },
    { Keterangan: "CATATAN:" },
    { Keterangan: "  - Kelompok Keahlian WAJIB diisi dan harus cocok dengan salah satu nama di daftar berikut" },
    { Keterangan: "  - NIM yang sudah ada akan diperbarui (hanya field yang berubah; penguji tidak diubah)" },
    { Keterangan: "  - Kode dosen harus terdaftar dan aktif di sistem" },
    { Keterangan: "  - Jangan ubah nama kolom pada sheet 'Template'" },
    { Keterangan: "" },
    { Keterangan: "DAFTAR KELOMPOK KEAHLIAN TERDAFTAR:" },
    ...kkList.map((k) => ({ Keterangan: `  - ${k.nama}` })),
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 40 },
    { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-plotting-penguji-semi.xlsx"',
    },
  });
}
