import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isKetua = session?.user.role === "DOSEN" && !!session.user.isKetua;
  if (!session || (!isAdmin && !isKetua)) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const dataRows = [
    {
      NIM: "6701180001",
      "Nama Mahasiswa": "Ahmad Fauzi",
      "Program Studi": "RPL",
      "Judul": "Sistem Informasi Manajemen",
      "Kode Pembimbing 1": "AAP",
      "Kode Pembimbing 2": "BBR",
      "Kode Penguji 1": "CCS",
      "Kode Penguji 2": "DDT",
      "Kelompok Keilmuan": "Rekayasa Perangkat Lunak",
    },
    {
      NIM: "6701180002",
      "Nama Mahasiswa": "Dewi Lestari",
      "Program Studi": "IF",
      "Judul": "Sistem Pakar Diagnosa Penyakit",
      "Kode Pembimbing 1": "EEU",
      "Kode Pembimbing 2": "",
      "Kode Penguji 1": "FFV",
      "Kode Penguji 2": "GGW",
      "Kelompok Keilmuan": "Kecerdasan Buatan",
    },
  ];

  const infoRows = [
    { Keterangan: "=== PETUNJUK — IMPORT PLOTTING SIDANG (METODE 1 — LENGKAP) ===" },
    { Keterangan: "" },
    { Keterangan: "Gunakan template ini untuk mengimpor data sidang LENGKAP:" },
    { Keterangan: "  - Data pembimbing (PBB I dan PBB II)" },
    { Keterangan: "  - Data penguji (PGJ I dan PGJ II)" },
    { Keterangan: "" },
    { Keterangan: "KOLOM WAJIB:" },
    { Keterangan: "  NIM — Nomor Induk Mahasiswa (unik, akan diperbarui jika sudah ada)" },
    { Keterangan: "  Nama Mahasiswa — Nama lengkap mahasiswa" },
    { Keterangan: "  Program Studi — Kode prodi: RPL, IF, DS, atau SI" },
    { Keterangan: "  Kode Pembimbing 1 — Kode dosen pembimbing utama" },
    { Keterangan: "  Kode Penguji 1 — Kode dosen penguji 1" },
    { Keterangan: "  Kode Penguji 2 — Kode dosen penguji 2" },
    { Keterangan: "" },
    { Keterangan: "KOLOM OPSIONAL:" },
    { Keterangan: "  Judul — Judul tugas akhir/sidang" },
    { Keterangan: "  Kode Pembimbing 2 — Kode dosen pembimbing 2" },
    { Keterangan: "  Kelompok Keilmuan — Kelompok keahlian mahasiswa" },
    { Keterangan: "" },
    { Keterangan: "VALIDASI:" },
    { Keterangan: "  - Penguji 1 tidak boleh sama dengan Penguji 2" },
    { Keterangan: "  - Kode dosen harus terdaftar dan aktif di sistem" },
    { Keterangan: "  - Jika Penguji sama dengan Pembimbing: sistem akan memberi peringatan" },
    { Keterangan: "    tetapi data tetap dapat dikonfirmasi" },
    { Keterangan: "  - NIM yang sudah ada akan diperbarui (bukan dilewati)" },
    { Keterangan: "  - Jangan ubah nama kolom pada sheet 'Template'" },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 40 },
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-plotting-sidang-lengkap.xlsx"',
    },
  });
}
