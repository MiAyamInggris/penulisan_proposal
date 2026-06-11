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
      "Kode Pembimbing 1": "AAP",
      "Kode Pembimbing 2": "BBR",
      "Tanggal Yudisium": "2026-06-15",
    },
    {
      NIM: "6701180002",
      "Nama Mahasiswa": "Dewi Lestari",
      "Kode Pembimbing 1": "CCS",
      "Kode Pembimbing 2": "",
      "Tanggal Yudisium": "2026-06-15",
    },
  ];

  const infoRows = [
    { Keterangan: "=== PETUNJUK PENGISIAN TEMPLATE — UPDATE MAHASISWA LULUS ===" },
    { Keterangan: "" },
    { Keterangan: "Fitur ini digunakan untuk:" },
    { Keterangan: "  - Memperbarui status mahasiswa yang sudah resmi lulus/yudisium menjadi LULUS" },
    { Keterangan: "  - Melepaskan kuota bimbingan dosen secara otomatis" },
    { Keterangan: "  - Menjaga riwayat bimbingan tetap tersimpan untuk pelaporan" },
    { Keterangan: "" },
    { Keterangan: "KOLOM WAJIB:" },
    { Keterangan: "  NIM — Nomor Induk Mahasiswa" },
    { Keterangan: "  Nama Mahasiswa — Nama lengkap mahasiswa" },
    { Keterangan: "  Kode Pembimbing 1 — Harus SAMA PERSIS dengan kode dosen Pembimbing 1" },
    { Keterangan: "    yang saat ini ditugaskan ke mahasiswa tersebut. Digunakan untuk" },
    { Keterangan: "    memastikan baris mengacu pada data bimbingan yang benar." },
    { Keterangan: "  Tanggal Yudisium — Format YYYY-MM-DD (contoh: 2026-06-15)" },
    { Keterangan: "" },
    { Keterangan: "KOLOM OPSIONAL:" },
    { Keterangan: "  Kode Pembimbing 2 — Kosongkan jika mahasiswa hanya memiliki Pembimbing 1." },
    { Keterangan: "    Jika diisi, harus sama persis dengan kode dosen Pembimbing 2 mahasiswa." },
    { Keterangan: "" },
    { Keterangan: "CATATAN:" },
    { Keterangan: "  - Baris yang Kode Pembimbing-nya tidak cocok dengan data assignment aktif" },
    { Keterangan: "    akan ditandai 'Invalid' dan TIDAK diproses (perlu peninjauan manual)" },
    { Keterangan: "  - Setelah diimpor, status mahasiswa berubah menjadi LULUS dan tidak lagi" },
    { Keterangan: "    dihitung dalam beban bimbingan dosen yang sedang berjalan" },
    { Keterangan: "  - Riwayat bimbingan, nilai, dan data historis TIDAK dihapus atau diubah" },
    { Keterangan: "  - Jangan ubah nama kolom pada sheet 'Template'" },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-update-mahasiswa-lulus.xlsx"',
    },
  });
}
