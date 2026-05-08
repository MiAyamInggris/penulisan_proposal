import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProgramsPage() {
  const programs = await prisma.program.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Program Studi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bobot penilaian per program studi (sesuai panduan 2024)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#C8102E] text-white text-sm rounded">
                  {p.code}
                </span>
                {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Komponen</th>
                    <th className="pb-2 font-medium text-right">Bobot</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2">Literature Review (TA1-05)</td>
                    <td className="py-2 text-right font-semibold">{p.literatureReviewPct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2">Keaktifan Bimbingan (TA1-01B)</td>
                    <td className="py-2 text-right font-semibold">{p.bimbinganPct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2">Desk Evaluation (TA1-02)</td>
                    <td className="py-2 text-right font-semibold">{p.deskEvaluationPct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2">Presentasi Seminar (TA1-03)</td>
                    <td className="py-2 text-right font-semibold">{p.presentasiPct}%</td>
                  </tr>
                  <tr className="font-bold text-[#C8102E]">
                    <td className="pt-3">Total</td>
                    <td className="pt-3 text-right">
                      {p.literatureReviewPct + p.bimbinganPct + p.deskEvaluationPct + p.presentasiPct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
