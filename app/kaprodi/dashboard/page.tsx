import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getMyProdi } from "@/lib/kaprodi";
import { countUniqueStudents } from "@/lib/quota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, XCircle, BarChart3, GraduationCap, FileText, Layers } from "lucide-react";

export default async function KaprodiDashboardPage() {
  const session = await auth();
  if (!session || !session.user.isKaprodi) redirect("/login");

  const prodi = await getMyProdi(session.user.id);
  if (!prodi) redirect("/dosen-select-role");

  const supervisionProposals = await prisma.proposal.findMany({
    where: {
      status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] },
      enrollment: { class: { programId: prodi.id } },
    },
    select: { academicStage: true, enrollment: { select: { studentId: true } } },
  });

  const totalTA2Students = countUniqueStudents(
    supervisionProposals.filter((p) => p.academicStage === "TUGAS_AKHIR_2")
  );
  const totalProposalStudents = countUniqueStudents(
    supervisionProposals.filter((p) => p.academicStage === "PENULISAN_PROPOSAL")
  );
  const totalSupervisionWorkload = totalTA2Students + totalProposalStudents;

  const classes = await prisma.class.findMany({
    where: { program: { id: prodi.id }, isSystemClass: false },
    orderBy: [{ academicYear: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      semester: true,
      academicYear: true,
      enrollments: {
        where: { isActive: true },
        select: {
          proposal: {
            select: {
              finalGrade: {
                select: { passed: true, weightedTotal: true },
              },
            },
          },
        },
      },
    },
  });

  type ClassRow = {
    id: string;
    code: string;
    name: string;
    semester: string;
    academicYear: string;
    total: number;
    lulus: number;
    tidakLulus: number;
    pending: number;
    pct: number | null;
  };

  const classRows: ClassRow[] = classes.map((c) => {
    const total = c.enrollments.length;
    let lulus = 0;
    let tidakLulus = 0;
    let pending = 0;

    for (const e of c.enrollments) {
      const fg = e.proposal?.finalGrade;
      if (fg?.weightedTotal !== null && fg?.weightedTotal !== undefined) {
        if (fg.passed) lulus++;
        else tidakLulus++;
      } else {
        pending++;
      }
    }

    const graded = lulus + tidakLulus;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      semester: c.semester,
      academicYear: c.academicYear,
      total,
      lulus,
      tidakLulus,
      pending,
      pct: graded > 0 ? (lulus / graded) * 100 : null,
    };
  });

  const totalMahasiswa = classRows.reduce((a, c) => a + c.total, 0);
  const totalLulus = classRows.reduce((a, c) => a + c.lulus, 0);
  const totalTidakLulus = classRows.reduce((a, c) => a + c.tidakLulus, 0);
  const totalGraded = totalLulus + totalTidakLulus;
  const overallPct = totalGraded > 0 ? (totalLulus / totalGraded) * 100 : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Kaprodi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Program Studi: <span className="font-semibold text-gray-700">{prodi.name} ({prodi.code})</span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Mahasiswa</p>
                <p className="text-2xl font-bold text-gray-900">{totalMahasiswa}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Lulus</p>
                <p className="text-2xl font-bold text-green-700">{totalLulus}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tidak Lulus</p>
                <p className="text-2xl font-bold text-red-700">{totalTidakLulus}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Kelulusan</p>
                <p className="text-2xl font-bold text-purple-700">
                  {overallPct !== null ? `${overallPct.toFixed(1)}%` : "–"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supervision workload (program-wide) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total TA2</p>
                <p className="text-2xl font-bold text-green-700">{totalTA2Students}</p>
                <p className="text-[10px] text-gray-400">mahasiswa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Proposal</p>
                <p className="text-2xl font-bold text-blue-700">{totalProposalStudents}</p>
                <p className="text-[10px] text-gray-400">mahasiswa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Supervision Workload</p>
                <p className="text-2xl font-bold text-purple-700">{totalSupervisionWorkload}</p>
                <p className="text-[10px] text-gray-400">mahasiswa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-class breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap per Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          {classRows.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada kelas di program studi ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Kelas</th>
                    <th className="py-2 pr-4 font-medium">Semester / TA</th>
                    <th className="py-2 pr-4 font-medium text-right">Total</th>
                    <th className="py-2 pr-4 font-medium text-right">Lulus</th>
                    <th className="py-2 pr-4 font-medium text-right">Tdk Lulus</th>
                    <th className="py-2 pr-4 font-medium text-right">Pending</th>
                    <th className="py-2 font-medium text-right">% Lulus</th>
                  </tr>
                </thead>
                <tbody>
                  {classRows.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{c.code}</span>
                        <span className="ml-2 text-xs text-gray-400">{c.name}</span>
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {c.semester} / {c.academicYear}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold">{c.total}</td>
                      <td className="py-2 pr-4 text-right text-green-700 font-semibold">{c.lulus}</td>
                      <td className="py-2 pr-4 text-right text-red-700 font-semibold">{c.tidakLulus}</td>
                      <td className="py-2 pr-4 text-right text-amber-600">{c.pending}</td>
                      <td className="py-2 text-right">
                        {c.pct !== null ? (
                          <Badge
                            className={
                              c.pct >= 75
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : c.pct >= 50
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {c.pct.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
