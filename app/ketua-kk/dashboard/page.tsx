import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";
import { getMyKK } from "@/lib/kk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Users, BookOpen, Activity, ClipboardCheck, BarChart3, TrendingUp } from "lucide-react";
import { DosenWorkloadTable } from "../dosen-workload-table";
import type { DosenRow } from "../dosen-workload-table";

export default async function KetuaKKDashboard() {
  const session = await auth();
  const myKK = await getMyKK(session!.user.id);

  if (!myKK) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ketua KK</h1>
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Anda belum ditugaskan ke Kelompok Keahlian</p>
            <p className="text-sm mt-1">
              Hubungi Admin untuk mendapatkan penugasan Kelompok Keahlian.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [dosenRaw, globalQuota] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true, kelompokKeahlianId: myKK.id },
      select: {
        id: true,
        name: true,
        identifier: true,
        kodeDosen: true,
        isKetua: true,
        supervisedAsFirst: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: {
            id: true,
            status: true,
            isHistoricalImport: true,
            titleId: true,
            supervisor1AssignedId: true,
            supervisor2AssignedId: true,
            enrollment: {
              select: {
                class: {
                  select: { code: true, academicYear: true, semester: true },
                },
                student: { select: { id: true, name: true, identifier: true } },
              },
            },
          },
        },
        supervisedAsSecond: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: {
            id: true,
            status: true,
            isHistoricalImport: true,
            titleId: true,
            supervisor1AssignedId: true,
            supervisor2AssignedId: true,
            enrollment: {
              select: {
                class: {
                  select: { code: true, academicYear: true, semester: true },
                },
                student: { select: { id: true, name: true, identifier: true } },
              },
            },
          },
        },
        assignedDeskEvals: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: {
            id: true,
            status: true,
            isHistoricalImport: true,
            enrollment: {
              select: {
                class: {
                  select: { code: true, academicYear: true, semester: true },
                },
                student: { select: { id: true, name: true, identifier: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getGlobalQuota(),
  ]);

  // Collect all student IDs across all assignments for isRetake check
  const allStudentIds = [
    ...new Set(
      dosenRaw.flatMap((d) => [
        ...d.supervisedAsFirst.map((p) => p.enrollment.student.id),
        ...d.supervisedAsSecond.map((p) => p.enrollment.student.id),
        ...d.assignedDeskEvals.map((p) => p.enrollment.student.id),
      ])
    ),
  ];

  const retakeStudentIds = new Set(
    (
      await prisma.classEnrollment.findMany({
        where: {
          studentId: { in: allStudentIds },
          proposal: { finalGrade: { passed: false } },
        },
        select: { studentId: true },
      })
    ).map((e) => e.studentId)
  );

  // Build typed rows with historical/active split
  const rows: DosenRow[] = dosenRaw.map((d) => {
    // Combine sv1 and sv2 assignments, tagging each with role
    const allBimbingan = [
      ...d.supervisedAsFirst.map((p) => ({ ...p, role: "P1" as const })),
      ...d.supervisedAsSecond.map((p) => ({ ...p, role: "P2" as const })),
    ];

    const activeAssignments = allBimbingan
      .filter((p) => p.status !== "COMPLETED")
      .map((p) => ({
        proposalId: p.id,
        role: p.role,
        titleId: p.titleId,
        status: p.status,
        studentName: p.enrollment.student.name,
        nim: p.enrollment.student.identifier,
        studentId: p.enrollment.student.id,
        classCode: p.enrollment.class.code,
        academicYear: p.enrollment.class.academicYear,
        semester: p.enrollment.class.semester,
        isRetake: retakeStudentIds.has(p.enrollment.student.id),
      }));

    const activeStudentIds = new Set(activeAssignments.map((a) => a.studentId));

    const historicalAssignments = allBimbingan
      .filter((p) => p.status === "COMPLETED")
      .map((p) => ({
        proposalId: p.id,
        role: p.role,
        titleId: p.titleId,
        status: p.status,
        studentName: p.enrollment.student.name,
        nim: p.enrollment.student.identifier,
        studentId: p.enrollment.student.id,
        classCode: p.enrollment.class.code,
        academicYear: p.enrollment.class.academicYear,
        semester: p.enrollment.class.semester,
        isRetake: retakeStudentIds.has(p.enrollment.student.id),
        isContinuedActive: activeStudentIds.has(p.enrollment.student.id),
      }));

    const deAssignments = d.assignedDeskEvals.map((p) => ({
      proposalId: p.id,
      status: p.status,
      isHistoricalImport: p.isHistoricalImport,
      studentName: p.enrollment.student.name,
      nim: p.enrollment.student.identifier,
      studentId: p.enrollment.student.id,
      classCode: p.enrollment.class.code,
      academicYear: p.enrollment.class.academicYear,
      semester: p.enrollment.class.semester,
      isRetake: retakeStudentIds.has(p.enrollment.student.id),
    }));

    const historicalCount = historicalAssignments.length;
    // "Mengulang" students can have multiple non-COMPLETED proposals (e.g. a
    // failed historical-import record and a new active record) under the same
    // dosen. Count unique students so each only contributes once to the
    // expected/active quota.
    const activeCount = activeStudentIds.size;
    const deCount = deAssignments.length;
    const historicalStudentIds = new Set(historicalAssignments.map((a) => a.studentId));
    const potentialTotal = new Set([...historicalStudentIds, ...activeStudentIds]).size;
    const duplicateActiveCount =
      historicalAssignments.length + activeAssignments.length - potentialTotal;
    const loadPct = globalQuota > 0 ? (potentialTotal / globalQuota) * 100 : 0;
    const remaining = globalQuota - potentialTotal;
    const loadStatus: DosenRow["loadStatus"] =
      loadPct > 100
        ? "melebihi-kuota"
        : loadPct > 80
        ? "hampir-penuh"
        : loadPct > 50
        ? "normal"
        : "ringan";

    return {
      id: d.id,
      name: d.name,
      identifier: d.identifier,
      kodeDosen: d.kodeDosen,
      isKetua: d.isKetua,
      historicalCount,
      activeCount,
      deCount,
      potentialTotal,
      duplicateActiveCount,
      remaining,
      loadPct,
      loadStatus,
      historicalAssignments,
      activeAssignments,
      deAssignments,
    };
  });

  // Summary stats
  const totalHistoricalStudents = new Set(
    rows.flatMap((r) => r.historicalAssignments.map((a) => a.studentId))
  ).size;
  const totalActiveStudents = new Set(
    rows.flatMap((r) => r.activeAssignments.map((a) => a.studentId))
  ).size;
  const totalBimbingan = rows.reduce((a, r) => a + r.potentialTotal, 0);
  const totalDE = rows.reduce((a, r) => a + r.deCount, 0);
  const avgLoad = rows.length > 0 ? totalBimbingan / rows.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ketua KK</h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{myKK.nama}</span> · kuota global:{" "}
          <span className="font-semibold text-gray-700">{globalQuota}</span> bimbingan/dosen
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 w-fit">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Total Dosen</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600 w-fit">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Historical TA2</p>
              <p className="text-2xl font-bold text-gray-700">{totalHistoricalStudents}</p>
              <p className="text-[10px] text-gray-400">mahasiswa</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 w-fit">
                <Activity className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Active Proposal</p>
              <p className="text-2xl font-bold text-blue-700">{totalActiveStudents}</p>
              <p className="text-[10px] text-gray-400">mahasiswa</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-green-50 text-green-600 w-fit">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Total Workload</p>
              <p className="text-2xl font-bold text-green-700">{totalBimbingan}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600 w-fit">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Total DE</p>
              <p className="text-2xl font-bold text-orange-700">{totalDE}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 w-fit">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Rata-rata Beban</p>
              <p className="text-2xl font-bold text-purple-700">{avgLoad.toFixed(1)}</p>
              <p className="text-[10px] text-gray-400">bimbingan/dosen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dosen workload table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Beban Dosen — {myKK.nama}
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Historical TA2 = bimbingan selesai (fixed) · Active Proposal = bimbingan berjalan (expected) · Klik baris untuk detail
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <DosenWorkloadTable rows={rows} globalQuota={globalQuota} kkName={myKK.nama} />
        </CardContent>
      </Card>
    </div>
  );
}
