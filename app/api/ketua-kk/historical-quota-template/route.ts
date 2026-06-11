import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isKetuaUser = session?.user.role === "DOSEN" && !!session.user.isKetua;
  if (!session || (!isAdmin && !isKetuaUser)) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const dataRows = [
    {
      NIM: "6701180001",
      "Nama Mahasiswa": "Ahmad Fauzi",
      "Program Studi": "RPL",
      "Kode Pembimbing 1": "AAP",
      "Kode Pembimbing 2": "BBR",
    },
    {
      NIM: "6701180002",
      "Nama Mahasiswa": "Dewi Lestari",
      "Program Studi": "IF",
      "Kode Pembimbing 1": "CCS",
      "Kode Pembimbing 2": "",
    },
  ];

  const infoRows = [
    { Keterangan: "=== PETUNJUK PENGISIAN TEMPLATE — IMPORT KUOTA HISTORIS TA2 ===" },
    { Keterangan: "" },
    { Keterangan: "Fitur ini HANYA untuk:" },
    { Keterangan: "  - Mendaftarkan mahasiswa yang sudah ada SEBELUM sistem ini digunakan" },
    { Keterangan: "  - Menyinkronkan beban bimbingan (kuota) dosen" },
    { Keterangan: "" },
    { Keterangan: "Fitur ini TIDAK untuk:" },
    { Keterangan: "  - Nilai bimbingan, literature review, presentasi, atau desk evaluation" },
    { Keterangan: "  - Rekap Nilai atau laporan kelulusan" },
    { Keterangan: "  - Kelas Proposal aktif" },
    { Keterangan: "" },
    { Keterangan: "KOLOM WAJIB:" },
    { Keterangan: "  NIM — Nomor Induk Mahasiswa" },
    { Keterangan: "  Nama Mahasiswa — Nama lengkap mahasiswa" },
    { Keterangan: "  Program Studi — Kode program studi: RPL, IF, DS, atau SI" },
    { Keterangan: "  Kode Pembimbing 1 — Kode dosen pembimbing 1 (wajib)" },
    { Keterangan: "" },
    { Keterangan: "KOLOM OPSIONAL:" },
    { Keterangan: "  Kode Pembimbing 2 — Kode dosen pembimbing 2 (kosongkan jika hanya 1 pembimbing)" },
    { Keterangan: "" },
    { Keterangan: "CATATAN:" },
    { Keterangan: "  - Mahasiswa yang belum terdaftar akan dibuat otomatis (password = NIM)" },
    { Keterangan: "  - Setiap mahasiswa otomatis ditempatkan di kelas sistem 'Tugas Akhir - Past'" },
    { Keterangan: "  - Mahasiswa akan dihitung sebagai 'Historical TA2' pada beban dosen terkait" },
    { Keterangan: "  - Jangan ubah nama kolom pada sheet 'Template'" },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-kuota-historis-ta-past.xlsx"',
    },
  });
}
