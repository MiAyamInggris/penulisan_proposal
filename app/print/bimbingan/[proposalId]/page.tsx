import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PrintButton } from "@/components/shared/PrintButton";

const S: Record<string, React.CSSProperties> = {
  table: { borderCollapse: "collapse", width: "100%", fontSize: "11px" },
  td: { border: "1px solid black", padding: "5px 8px", verticalAlign: "top" },
  th: { border: "1px solid black", padding: "5px 8px", backgroundColor: "#e5e5e5", fontWeight: "bold", textAlign: "center" },
};

type NilaiRow = {
  label: string;
  criteria: string;
  max: number;
  field: keyof NilaiData;
};

type NilaiData = {
  pemilihanTema: number;
  researchQuestion: number;
  studiLiteratur1: number;
  studiLiteratur2: number;
  rencanaImplementasi: number;
  kemandirian: number;
  prosesBimbingan: number;
  notes: string | null;
};

const PEMBUATAN_ROWS: NilaiRow[] = [
  {
    label: "Pemilihan Tema",
    criteria: "Kemampuan memilih dan menjustifikasi Tema yang akan diangkat dari sisi LatarBelakang dan Rumusan Masalah",
    max: 15,
    field: "pemilihanTema",
  },
  {
    label: "Pertanyaan Penelitian",
    criteria: "Cara menyajikan pertanyaan penelitian/problem statement untuk membangun Rumusan Masalah dan Tujuan",
    max: 15,
    field: "researchQuestion",
  },
  {
    label: "Studi Literatur",
    criteria: "Ide/gagasan/strategi untuk menyelesaikan masalah",
    max: 10,
    field: "studiLiteratur1",
  },
  {
    label: "",
    criteria: "Justifikasi pemilihan model/metode/teori baik model simulasi, komputasi atau model pembangunan aplikasi / perangkat lunak dengan melakukan studi literatur",
    max: 10,
    field: "studiLiteratur2",
  },
  {
    label: "Rencana Implementasi Simulasi/Komputasi",
    criteria: "Penjelasan tentang bagaimana membangun Implementasi / Simulasi / Komputasi yang diturunkan dari pemodelan",
    max: 10,
    field: "rencanaImplementasi",
  },
];

const EXPERT_ROWS: NilaiRow[] = [
  { label: "", criteria: "Kemandirian mahasiswa dalam penyusunan proposal", max: 20, field: "kemandirian" },
  { label: "", criteria: "Proses bimbingan", max: 20, field: "prosesBimbingan" },
];

function totalOf(nb: NilaiData): number {
  return nb.pemilihanTema + nb.researchQuestion + nb.studiLiteratur1 +
    nb.studiLiteratur2 + nb.rencanaImplementasi + nb.kemandirian + nb.prosesBimbingan;
}

function FormPage({
  student,
  title,
  nb,
  supervisorName,
  supervisorNip,
}: {
  student: { name: string; identifier: string };
  title: string;
  nb: NilaiData | null;
  supervisorName: string;
  supervisorNip: string;
}) {
  const total = nb ? totalOf(nb) : null;

  return (
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
            <td style={S.td}>TUP-S1RPL-FM-TA-002</td>
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
              FORMULIR NILAI BIMBINGAN PROPOSAL TA Prodi S1<br />REKAYASA PERANGKAT LUNAK
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
        FORMULIR NILAI BIMBINGAN PROPOSAL TA<br />PRODI S1 REKAYASA PERANGKAT LUNAK
      </div>

      {/* Student info */}
      <table style={{ ...S.table, marginBottom: "8px" }}>
        <tbody>
          {[
            ["Nama Mahasiswa", student.name],
            ["Nim", student.identifier],
            ["Judul Proposal", title],
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
            <td style={{ ...S.td, width: "120px", fontWeight: "bold" }}>CLO-06-2</td>
            <td style={S.td}>
              Mampu menerapkan pemikiran inovatif dalam konteks pengembangan atau implementasi ilmu pengetahuan dan/atau teknologi sesuai dengan bidang keahliannya
            </td>
          </tr>
          <tr>
            <td style={{ ...S.td, fontWeight: "bold" }}>SubCLO 6-2-1</td>
            <td style={S.td}>Mampu mendeskripsikan kaidah ilmiah untuk menghasilkan solusi</td>
          </tr>
        </tbody>
      </table>

      {/* Score table */}
      <table style={{ ...S.table, marginBottom: "16px" }}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: "110px" }}>Komponen Penilaian</th>
            <th style={S.th}>Kriteria Penilaian</th>
            <th style={{ ...S.th, width: "80px" }}>Nilai Maks</th>
            <th style={{ ...S.th, width: "70px" }}>Nilai</th>
          </tr>
        </thead>
        <tbody>
          {/* Pembuatan Proposal group */}
          {PEMBUATAN_ROWS.map((row, idx) => (
            <tr key={idx}>
              {idx === 0 && (
                <td
                  rowSpan={PEMBUATAN_ROWS.length}
                  style={{
                    ...S.td,
                    textAlign: "center",
                    verticalAlign: "middle",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Pembuatan Proposal
                </td>
              )}
              <td style={S.td}>
                {row.label && <><strong>{row.label}</strong><br /></>}
                <span style={{ fontSize: "10px" }}>{row.criteria}</span>
              </td>
              <td style={{ ...S.td, textAlign: "center" }}>{row.max}</td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {nb ? (nb[row.field] as number).toFixed(1) : ""}
              </td>
            </tr>
          ))}

          {/* Expert Judgement group */}
          {EXPERT_ROWS.map((row, idx) => (
            <tr key={`expert-${idx}`}>
              {idx === 0 && (
                <td
                  rowSpan={EXPERT_ROWS.length}
                  style={{
                    ...S.td,
                    textAlign: "center",
                    verticalAlign: "middle",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Expert Judgement
                </td>
              )}
              <td style={S.td}>{row.criteria}</td>
              <td style={{ ...S.td, textAlign: "center" }}>{row.max}</td>
              <td style={{ ...S.td, textAlign: "center" }}>
                {nb ? (nb[row.field] as number).toFixed(1) : ""}
              </td>
            </tr>
          ))}

          {/* Total */}
          <tr>
            <td colSpan={2} style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>
              Jumlah
            </td>
            <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>100</td>
            <td style={{ ...S.td, textAlign: "center", fontWeight: "bold", backgroundColor: "#e5e5e5" }}>
              {total !== null ? total.toFixed(1) : "0"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      {nb?.notes && (
        <table style={{ ...S.table, marginBottom: "16px" }}>
          <thead>
            <tr><th style={S.th}><em>Catatan</em></th></tr>
          </thead>
          <tbody>
            <tr><td style={{ ...S.td, minHeight: "60px" }}>{nb.notes}</td></tr>
          </tbody>
        </table>
      )}
      {!nb?.notes && (
        <table style={{ ...S.table, marginBottom: "16px" }}>
          <thead>
            <tr><th style={S.th}><em>Catatan</em></th></tr>
          </thead>
          <tbody>
            <tr><td style={{ ...S.td, height: "60px" }}></td></tr>
          </tbody>
        </table>
      )}

      {/* Signature */}
      <table style={{ ...S.table, marginBottom: "8px" }}>
        <tbody>
          <tr>
            <td style={{ ...S.td, textAlign: "center", height: "80px", verticalAlign: "top" }}>
              <em>Calon Pembimbing I</em>
            </td>
            <td style={{ ...S.td, width: "50%" }}></td>
          </tr>
          <tr>
            <td style={{ ...S.td, textAlign: "center" }}>
              {supervisorName}<br />
              <span style={{ fontSize: "10px" }}>{supervisorNip}</span>
            </td>
            <td style={S.td}></td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: "10px", marginTop: "12px", fontStyle: "italic" }}>
        Form TA1-01B: Formulir Nilai Bimbingan Proposal
      </div>
    </div>
  );
}

export default async function PrintBimbinganPage({
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
      nilaiBimbingan: {
        include: { pembimbing: { select: { name: true, identifier: true } } },
        orderBy: { createdAt: "asc" },
      },
      supervisor1Assigned: { select: { name: true, identifier: true } },
      supervisor2Assigned: { select: { name: true, identifier: true } },
    },
  });

  if (!proposal) notFound();

  const student = proposal.enrollment.student;

  // Build list of (supervisorName, supervisorNip, nilaiData | null) for each supervisor
  const sup1 = proposal.supervisor1Assigned;
  const sup2 = proposal.supervisor2Assigned;

  const nb1 = proposal.nilaiBimbingan.find((n) => n.pembimbing.name === sup1?.name) ?? proposal.nilaiBimbingan[0] ?? null;
  const nb2 = sup2
    ? (proposal.nilaiBimbingan.find((n) => n.pembimbing.name === sup2.name) ??
        (proposal.nilaiBimbingan.length > 1 ? proposal.nilaiBimbingan[1] : null))
    : null;

  const pages: { supervisorName: string; supervisorNip: string; nb: NilaiData | null }[] = [
    {
      supervisorName: sup1?.name ?? "–",
      supervisorNip: sup1?.identifier ?? "#N/A",
      nb: nb1,
    },
  ];

  if (sup2) {
    pages.push({
      supervisorName: sup2.name,
      supervisorNip: sup2.identifier ?? "#N/A",
      nb: nb2,
    });
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
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
          Form Nilai Bimbingan — {student.name}
          {pages.length > 1 && " (2 halaman — satu per pembimbing)"}
        </span>
      </div>

      {pages.map((page, idx) => (
        <div key={idx} className={idx > 0 ? "page-break" : ""}>
          <FormPage
            student={student}
            title={proposal.titleId}
            nb={page.nb}
            supervisorName={page.supervisorName}
            supervisorNip={page.supervisorNip}
          />
        </div>
      ))}
    </>
  );
}
