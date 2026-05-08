type Program = {
  literatureReviewPct: number;
  bimbinganPct: number;
  deskEvaluationPct: number;
  presentasiPct: number;
};

type ScoreSummaryProps = {
  program: Program;
  lrScore: number | null;
  bimbinganScore: number | null;
  deScore: number | null;
  deIsLate?: boolean;
  presentasiScore: number | null;
  weightedTotal?: number | null;
  gradeIndex?: string | null;
  passed?: boolean | null;
};

function row(
  label: string,
  raw: number | null,
  pct: number,
  note?: string
): {
  label: string;
  raw: string;
  pct: string;
  contribution: string;
  note?: string;
} {
  const rawStr = raw !== null ? `${raw.toFixed(1)} / 100` : "–";
  const contribution =
    raw !== null ? `${((raw * pct) / 100).toFixed(2)}` : "–";
  return { label, raw: rawStr, pct: `${pct}%`, contribution, note };
}

export function ScoreSummary({
  program,
  lrScore,
  bimbinganScore,
  deScore,
  deIsLate,
  presentasiScore,
  weightedTotal,
  gradeIndex,
  passed,
}: ScoreSummaryProps) {
  const rows = [
    row(
      "Literature Review",
      lrScore,
      program.literatureReviewPct
    ),
    row(
      "Keaktifan Bimbingan",
      bimbinganScore,
      program.bimbinganPct
    ),
    row(
      "Desk Evaluation",
      deScore,
      program.deskEvaluationPct,
      deIsLate ? "⚠ terlambat, maks 51" : undefined
    ),
    row(
      "Presentasi Seminar",
      presentasiScore,
      program.presentasiPct
    ),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 text-gray-500 font-medium">
              Komponen
            </th>
            <th className="text-right py-2 text-gray-500 font-medium">
              Nilai Mentah
            </th>
            <th className="text-right py-2 text-gray-500 font-medium">
              Bobot
            </th>
            <th className="text-right py-2 text-gray-500 font-medium">
              Kontribusi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-2 text-gray-700">
                {r.label}
                {r.note && (
                  <span className="ml-1 text-xs text-orange-500">{r.note}</span>
                )}
              </td>
              <td className="py-2 text-right text-gray-600">{r.raw}</td>
              <td className="py-2 text-right text-gray-500">{r.pct}</td>
              <td className="py-2 text-right font-medium text-gray-800">
                {r.contribution}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-bold">
            <td className="py-2 text-gray-900" colSpan={3}>
              Total
            </td>
            <td className="py-2 text-right text-gray-900">
              {weightedTotal != null ? weightedTotal.toFixed(2) : "–"}
            </td>
          </tr>
          {gradeIndex != null && (
            <tr>
              <td className="py-1 text-gray-600 font-medium" colSpan={3}>
                Grade
              </td>
              <td className="py-1 text-right text-2xl font-bold text-[#C8102E]">
                {gradeIndex}
              </td>
            </tr>
          )}
          {passed != null && (
            <tr>
              <td className="py-1 text-gray-600 font-medium" colSpan={3}>
                Status
              </td>
              <td
                className={`py-1 text-right font-bold ${
                  passed ? "text-green-600" : "text-red-600"
                }`}
              >
                {passed ? "LULUS" : "TIDAK LULUS"}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}
