import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PrintButton } from "@/components/shared/PrintButton";

const S: Record<string, React.CSSProperties> = {
  table: { borderCollapse: "collapse", width: "100%", fontSize: "11px" },
  td: { border: "1px solid black", padding: "5px 8px", verticalAlign: "top" },
  th: { border: "1px solid black", padding: "5px 8px", backgroundColor: "#e5e5e5", fontWeight: "bold", textAlign: "center" },
};

const CRITERIA = [
  { label: "Kualitas pustaka sebagai referensi utama", max: 10, field: "kualitasPustaka" },
  { label: "Konten pustaka mengenai rumusan masalah", max: 10, field: "kontenRumusan" },
  { label: "Analisis pustaka terkait tujuan atau ide pokok", max: 10, field: "analisisTujuan" },
  { label: "Kelengkapan kajian teori mengenai metode atau algoritma", max: 10, field: "kelengkapanKajian" },
  { label: "Kelebihan dan kekurangan penelitian", max: 40, field: "kelebihanKekurangan" },
  { label: "Relasi teori terhadap topik proposal", max: 20, field: "relasiTeori" },
] as const;

type NilaiLR = {
  kualitasPustaka: number;
  kontenRumusan: number;
  analisisTujuan: number;
  kelengkapanKajian: number;
  kelebihanKekurangan: number;
  relasiTeori: number;
  catatan: string | null;
  pembimbing: { name: string; identifier: string };
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function totalOf(nlr: NilaiLR): number {
  return nlr.kualitasPustaka + nlr.kontenRumusan + nlr.analisisTujuan +
    nlr.kelengkapanKajian + nlr.kelebihanKekurangan + nlr.relasiTeori;
}

export default async function PrintLRPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { proposalId } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
        },
      },
      nilaiLiteratureReview: {
        include: { pembimbing: { select: { name: true, identifier: true } } },
        orderBy: { createdAt: "asc" },
      },
      seminar: { select: { scheduledDate: true } },
      supervisor1Assigned: { select: { name: true, identifier: true } },
      supervisor2Assigned: { select: { name: true, identifier: true } },
    },
  });

  if (!proposal) notFound();

  const student = proposal.enrollment.student;
  const tanggalSeminar = fmtDate(proposal.seminar?.scheduledDate);

  const sup1 = proposal.supervisor1Assigned;
  const sup2 = proposal.supervisor2Assigned;

  const nlr1: NilaiLR | null =
    proposal.nilaiLiteratureReview.find((n) => n.pembimbingId === (sup1 as { id?: string } | null)?.id) ??
    proposal.nilaiLiteratureReview[0] ??
    null;
  const nlr2: NilaiLR | null = sup2
    ? (proposal.nilaiLiteratureReview.find((n) => n.pembimbingId === (sup2 as { id?: string }).id) ??
        (proposal.nilaiLiteratureReview.length > 1 ? proposal.nilaiLiteratureReview[1] : null))
    : null;

  const total1 = nlr1 ? totalOf(nlr1) : null;
  const total2 = nlr2 ? totalOf(nlr2) : null;
  const rataRata =
    total1 !== null && total2 !== null
      ? ((total1 + total2) / 2).toFixed(2)
      : total1 !== null
      ? total1.toFixed(2)
      : "–";

  const catatan = nlr1?.catatan ?? nlr2?.catatan ?? "";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
        }
        @page { size: A4; margin: 1.5cm; }
      `}</style>

      <div className="no-print" style={{ background: "#f3f4f6", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #d1d5db" }}>
        <PrintButton />
        <a href="/dosen-kelas/nilai" style={{ color: "#2563eb", textDecoration: "none", fontSize: "14px" }}>
          ← Kembali ke Rekap
        </a>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          Form Nilai Literature Review — {student.name}
        </span>
      </div>

      <div style={{ padding: "20px 30px", maxWidth: "800px", margin: "0 auto", fontFamily: "Arial, sans-serif", fontSize: "11px" }}>

        {/* === HEADER === */}
        <table style={S.table}>
          <tbody>
            <tr>
              <td rowSpan={4} style={{ ...S.td, width: "80px", textAlign: "center", verticalAlign: "middle" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#C8102E", lineHeight: 1.2 }}>Telkom</div>
                <div style={{ fontSize: "10px", color: "#003087" }}>University</div>
              </td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", fontSize: "12px" }}>UNIVERSITAS TELKOM</td>
              <td style={S.td}>No. Dokumen</td>
              <td style={S.td}>TUP-S1RPL-FM-NLR-001</td>
            </tr>
            <tr>
              <td style={{ ...S.td, textAlign: "center", fontSize: "10px" }}>
                Jl. Telekomunikasi No. 1, Dayeuh Kolot, Kab. Bandung 40257
              </td>
              <td style={S.td}>No. Revisi</td>
              <td style={S.td}>0</td>
            </tr>
            <tr>
              <td rowSpan={2} style={{ ...S.td, textAlign: "center", fontWeight: "bold", verticalAlign: "middle" }}>
                FORMULIR NILAI LITERATURE REVIEW TA Prodi S1<br />REKAYASA PERANGKAT LUNAK
              </td>
              <td style={S.td}>Berlaku Efektif</td>
              <td style={S.td}>02 Januari 2025</td>
            </tr>
            <tr>
              <td style={S.td}>Halaman</td>
              <td style={S.td}>1 dari 1</td>
            </tr>
          </tbody>
        </table>

        {/* Title */}
        <div style={{ textAlign: "center", margin: "20px 0 10px", fontWeight: "bold", fontSize: "13px" }}>
          FORMULIR NILAI LITERATURE REVIEW<br />PRODI S1 REKAYASA PERANGKAT LUNAK
        </div>

        {/* Student info */}
        <table style={{ ...S.table, marginBottom: "8px" }}>
          <tbody>
            {[
              ["Nama Mahasiswa", student.name],
              ["Nim", student.identifier],
              ["Judul Proposal", proposal.titleId],
              ["Tanggal Seminar", tanggalSeminar],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ ...S.td, width: "160px" }}>{label}</td>
                <td style={S.td}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* CLO info */}
        <table style={{ ...S.table, marginBottom: "16px" }}>
          <tbody>
            <tr>
              <td style={{ ...S.td, width: "120px", fontWeight: "bold" }}>CLO-02.2</td>
              <td style={S.td}>Mampu menjelaskan kebutuhan akan pembelajaran sepanjang hayat dalam bidang keilmuan RPL.</td>
            </tr>
            <tr>
              <td style={{ ...S.td, fontWeight: "bold" }}>Sub-CLO-02-2-1</td>
              <td style={S.td}>Mampu mengkaji permasalahan yang berkaitan dengan perangkat lunak sebagai usulan solusi</td>
            </tr>
          </tbody>
        </table>

        {/* Score table with two supervisor columns */}
        <table style={{ ...S.table, marginBottom: "12px" }}>
          <thead>
            <tr>
              <th rowSpan={2} style={S.th}>Komponen Penilaian</th>
              <th rowSpan={2} style={{ ...S.th, width: "80px" }}>Nilai Maks</th>
              <th colSpan={2} style={S.th}>Nilai</th>
            </tr>
            <tr>
              <th style={{ ...S.th, width: "90px" }}>Calon Pembimbing I</th>
              <th style={{ ...S.th, width: "90px" }}>Calon Pembimbing II*</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((c) => (
              <tr key={c.field}>
                <td style={S.td}>{c.label}</td>
                <td style={{ ...S.td, textAlign: "center" }}>{c.max}</td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  {nlr1 ? (nlr1[c.field] as number).toFixed(1) : ""}
                </td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  {nlr2 ? (nlr2[c.field] as number).toFixed(1) : ""}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>Jumlah</td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>100</td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>
                {total1 !== null ? total1.toFixed(1) : "0"}
              </td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>
                {total2 !== null ? total2.toFixed(1) : ""}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ ...S.td, textAlign: "center", fontWeight: "bold" }}>Rata-rata nilai Calon Pembimbing</td>
              <td colSpan={2} style={{ ...S.td, textAlign: "center", fontWeight: "bold" }}>{rataRata}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: "10px", marginBottom: "16px", fontStyle: "italic" }}>
          *) Diisi bila presentasi dilakukan kepada dua orang calon pembimbing
        </p>

        {/* Notes */}
        <table style={{ ...S.table, marginBottom: "24px" }}>
          <thead>
            <tr><th style={S.th}><em>CATATAN REVIEWER/USULAN PERBAIKAN</em></th></tr>
          </thead>
          <tbody>
            <tr><td style={{ ...S.td, height: "70px", verticalAlign: "top" }}>{catatan}</td></tr>
          </tbody>
        </table>

        {/* Signatures */}
        <table style={{ ...S.table, marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={{ ...S.td, width: "50%", textAlign: "center", height: "80px", verticalAlign: "top" }}>
                <em>Calon Pembimbing I,</em>
              </td>
              <td style={{ ...S.td, textAlign: "center", verticalAlign: "top" }}>
                <em>Calon Pembimbing II,</em>
              </td>
            </tr>
            <tr>
              <td style={{ ...S.td, textAlign: "center" }}>
                {sup1?.name ?? "–"}<br />
                <span style={{ fontSize: "10px" }}>{sup1?.identifier ?? "#N/A"}</span>
              </td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {sup2?.name ?? ""}<br />
                <span style={{ fontSize: "10px" }}>{sup2?.identifier ?? "#N/A"}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: "10px", fontStyle: "italic", marginTop: "8px" }}>
          Catatan: Form asli hasil presentasi dikumpulkan oleh Dosen Kelas TA ke Program Studi setelah unggah DNA. Fotokopi form ini disimpan oleh mahasiswa.
        </p>
        <div style={{ fontSize: "10px", marginTop: "4px", fontStyle: "italic" }}>
          Form TA1-05: Formulir Nilai literatur review Proposal TA
        </div>
      </div>
    </>
  );
}
