import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { type ColumnDef } from "@tanstack/react-table";

export default async function NilaiRekapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClassIds = (
    await prisma.class.findMany({
      where: { dosenKelasId: session.user.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: { in: myClassIds }, isActive: true },
    include: {
      student: { select: { name: true, identifier: true } },
      class: { select: { code: true, program: { select: { code: true } } } },
      proposal: {
        include: {
          finalGrade: true,
          deskEvaluation: { select: { isLate: true } },
        },
      },
    },
    orderBy: [{ class: { code: "asc" } }, { student: { name: "asc" } }],
  });

  const rows = enrollments.map((e) => ({
    id: e.id,
    nim: e.student.identifier,
    name: e.student.name,
    kelas: e.class.code,
    prodi: e.class.program.code,
    lrScore: e.proposal?.finalGrade?.lrScore ?? null,
    bimbinganScore: e.proposal?.finalGrade?.bimbinganScore ?? null,
    deScore: e.proposal?.finalGrade?.deScore ?? null,
    presentasiScore: e.proposal?.finalGrade?.presentasiScore ?? null,
    weightedTotal: e.proposal?.finalGrade?.weightedTotal ?? null,
    gradeIndex: e.proposal?.finalGrade?.gradeIndex ?? null,
    passed: e.proposal?.finalGrade?.passed ?? null,
    isLate: e.proposal?.deskEvaluation?.isLate ?? false,
  }));

  type Row = typeof rows[number];

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "kelas", header: "Kelas" },
    { accessorKey: "nim", header: "NIM" },
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "prodi", header: "Prodi" },
    {
      accessorKey: "lrScore",
      header: "LR",
      cell: ({ row }) => row.original.lrScore?.toFixed(1) ?? "–",
    },
    {
      accessorKey: "bimbinganScore",
      header: "Bimbingan",
      cell: ({ row }) => row.original.bimbinganScore?.toFixed(1) ?? "–",
    },
    {
      accessorKey: "deScore",
      header: "DE",
      cell: ({ row }) => (
        <span>
          {row.original.deScore?.toFixed(1) ?? "–"}
          {row.original.isLate && <span className="text-xs text-red-400 ml-1">(L)</span>}
        </span>
      ),
    },
    {
      accessorKey: "presentasiScore",
      header: "Presentasi",
      cell: ({ row }) => row.original.presentasiScore?.toFixed(1) ?? "–",
    },
    {
      accessorKey: "weightedTotal",
      header: "Nilai Akhir",
      cell: ({ row }) =>
        row.original.weightedTotal !== null ? (
          <span className="font-bold">{row.original.weightedTotal.toFixed(2)}</span>
        ) : (
          "–"
        ),
    },
    {
      accessorKey: "gradeIndex",
      header: "Huruf",
      cell: ({ row }) => <span className="font-bold text-lg">{row.original.gradeIndex ?? "–"}</span>,
    },
    {
      accessorKey: "passed",
      header: "Status",
      cell: ({ row }) =>
        row.original.passed === null ? (
          <span className="text-gray-400 text-xs">–</span>
        ) : row.original.passed ? (
          <span className="text-green-600 font-semibold text-xs">LULUS</span>
        ) : (
          <span className="text-red-600 font-semibold text-xs">TIDAK LULUS</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekap Nilai</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nilai akhir seluruh mahasiswa di kelas Anda
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tabel Rekap Nilai</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={rows} searchPlaceholder="Cari mahasiswa..." />
        </CardContent>
      </Card>
    </div>
  );
}
