import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PrintButton } from "@/components/shared/PrintButton";

const S: Record<string, React.CSSProperties> = {
  table: { borderCollapse: "collapse", width: "100%", fontSize: "11px" },
  td: { border: "1px solid black", padding: "5px 8px", verticalAlign: "top" },
  th: { border: "1px solid black", padding: "5px 8px", backgroundColor: "#e5e5e5", fontWeight: "bold", textAlign: "center" },
  center: { textAlign: "center" },
  bold: { fontWeight: "bold" },
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default async function PrintDEPage({
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
          class: { select: { code: true, deDeadline: true } },
        },
      },
      deskEvaluation: {
        include: { evaluator: { select: { name: true, identifier: true } } },
      },
    },
  });

  if (!proposal) notFound();

  const de = proposal.deskEvaluation;
  const student = proposal.enrollment.student;
  const totalScore = de
    ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
    : null;
  const verdict =
    totalScore !== null ? (totalScore >= 50 ? "LAYAK" : "TIDAK LAYAK") : "–";
  const tanggalEvaluasi = fmtDate(proposal.enrollment.class.deDeadline);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
        }
        @page { size: A4; margin: 1.5cm; }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print" style={{ background: "#f3f4f6", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #d1d5db" }}>
        <PrintButton />
        <a href="/dosen-kelas/desk-evaluation" style={{ color: "#2563eb", textDecoration: "none", fontSize: "14px" }}>
          ← Kembali ke Daftar
        </a>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          Form Nilai Desk Evaluation — {student.name}
        </span>
      </div>

      {/* Form body */}
      <div style={{ padding: "20px 30px", maxWidth: "800px", margin: "0 auto", fontFamily: "Arial, sans-serif", fontSize: "11px" }}>

        {/* === HEADER === */}
        <table style={S.table}>
          <tbody>
            <tr>
              <td rowSpan={4} style={{ ...S.td, width: "80px", textAlign: "center", verticalAlign: "middle" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#C8102E", lineHeight: 1.2 }}>Telkom</div>
                <div style={{ fontSize: "10px", color: "#003087" }}>University</div>
              </td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", fontSize: "12px" }}>
                UNIVERSITAS TELKOM
              </td>
              <td style={S.td}>No. Dokumen</td>
              <td style={S.td}>TUP-S1RPL-FM-TA-003</td>
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
                FORMULIR NILAI DESK EVALUATION PRODI S1<br />REKAYASA PERANGKAT LUNAK
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
          FORMULIR NILAI DESK EVALUATION<br />
          PRODI S1 REKAYASA PERANGKAT LUNAK
        </div>

        {/* Student info */}
        <table style={{ ...S.table, marginBottom: "8px" }}>
          <tbody>
            {[
              ["Nama Mahasiswa", student.name],
              ["Nim", student.identifier],
              ["Judul Proposal", proposal.titleId],
              ["Tanggal Evaluasi", tanggalEvaluasi],
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
              <td style={{ ...S.td, width: "120px", fontWeight: "bold" }}>CLO-03.3</td>
              <td style={S.td}>Mampu menjelaskan dan menerapkan metode rekayasa untuk membangun perangkat lunak yang otomatis.</td>
            </tr>
            <tr>
              <td style={{ ...S.td, fontWeight: "bold" }}>CLO-07-2-1</td>
              <td style={S.td}>Mampu mengomunikasikan usulan solusi rekayasa perangkat lunak secara ilmiah</td>
            </tr>
          </tbody>
        </table>

        {/* Score table */}
        <table style={{ ...S.table, marginBottom: "16px" }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: "40px" }}>No</th>
              <th style={S.th}>Aspek Penilaian</th>
              <th style={{ ...S.th, width: "90px" }}>Nilai Maks</th>
              <th style={{ ...S.th, width: "80px" }}>Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...S.td, textAlign: "center" }}>1.</td>
              <td style={S.td}>
                <strong>Latar Belakang</strong><br />
                - Motivasi<br />
                - Kemanfaatan / Dampak
              </td>
              <td style={{ ...S.td, textAlign: "center" }}>25</td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {de ? de.latarBelakang.toFixed(1) : ""}
              </td>
            </tr>
            <tr>
              <td style={{ ...S.td, textAlign: "center" }}>2.</td>
              <td style={S.td}>
                <strong>Formulasi Masalah</strong><br />
                - Tujuan<br />
                - Hipotesis<br />
                - Batasan/Asumsi yang digunakan<br />
                - Kelayakan waktu dan sarana pendukung
              </td>
              <td style={{ ...S.td, textAlign: "center" }}>30</td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {de ? de.formulasiMasalah.toFixed(1) : ""}
              </td>
            </tr>
            <tr>
              <td style={{ ...S.td, textAlign: "center" }}>3.</td>
              <td style={S.td}><strong>Teori Pendukung / Penelusuran Literatur</strong></td>
              <td style={{ ...S.td, textAlign: "center" }}>30</td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {de ? de.teoriPendukung.toFixed(1) : ""}
              </td>
            </tr>
            <tr>
              <td style={{ ...S.td, textAlign: "center" }}>4.</td>
              <td style={S.td}><strong>Ide/Metode Penyelesaian masalah</strong></td>
              <td style={{ ...S.td, textAlign: "center" }}>15</td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {de ? de.ideMetode.toFixed(1) : ""}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>
                Total
              </td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>100</td>
              <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>
                {totalScore !== null ? totalScore.toFixed(1) : "0"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Verdict */}
        <div style={{ marginBottom: "16px", fontSize: "11px", lineHeight: "1.8" }}>
          <strong>Berdasarkan hasil evaluasi tersebut, proposal tugas akhir ini dinyatakan:</strong>{" "}
          <span style={{ borderBottom: "1px solid black", padding: "0 20px", fontWeight: "bold" }}>
            {verdict}
          </span>{" "}
          untuk mengikuti proses seminar dengan calon pembimbing yang telah disetujui
        </div>

        {/* Notes section */}
        <table style={{ ...S.table, marginBottom: "24px" }}>
          <thead>
            <tr>
              <th style={S.th}><em>CATATAN REVIEWER/USULAN PERBAIKAN</em></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...S.td, height: "80px", verticalAlign: "top" }}>
                {de?.catatanReviewer ?? ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature */}
        <table style={{ ...S.table, marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={{ ...S.td, width: "50%", textAlign: "center", height: "80px", verticalAlign: "top" }}>
                <em>Reviewer Desk Evaluation</em>
              </td>
              <td style={{ ...S.td, width: "50%" }}></td>
            </tr>
            <tr>
              <td style={{ ...S.td, textAlign: "center" }}>
                {de?.evaluator?.name ?? "–"}<br />
                <span style={{ fontSize: "10px" }}>{de?.evaluator?.identifier ?? "#N/A"}</span>
              </td>
              <td style={S.td}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: "10px", marginTop: "12px", fontStyle: "italic" }}>
          Form TA1-02: Formulir Nilai Desk Evaluation
        </div>
      </div>
    </>
  );
}
