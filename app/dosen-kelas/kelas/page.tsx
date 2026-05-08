import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function KelasDetailPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClasses = await prisma.class.findMany({
    where: { dosenKelasId: session.user.id },
    include: {
      program: true,
      enrollments: {
        where: { isActive: true },
        include: {
          student: { select: { name: true, identifier: true } },
          proposal: {
            include: {
              bimbinganSessions: { select: { id: true } },
              deskEvaluation: { select: { id: true } },
              seminar: { select: { status: true } },
              finalGrade: { select: { weightedTotal: true, gradeIndex: true } },
            },
          },
          eprt: { select: { status: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Detail Kelas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daftar mahasiswa dan progres per kelas
        </p>
      </div>

      {myClasses.map((cls) => {
        const rows = cls.enrollments.map((e) => ({
          id: e.id,
          name: e.student.name,
          nim: e.student.identifier,
          status: e.proposal?.status ?? "ENROLLED",
          bimbinganCount: e.proposal?.bimbinganSessions.length ?? 0,
          eprtStatus: e.eprt?.status ?? null,
          deStatus: e.proposal?.deskEvaluation ? "Ada" : "–",
          seminarStatus: e.proposal?.seminar?.status ?? null,
          nilaiAkhir: e.proposal?.finalGrade?.weightedTotal ?? null,
          grade: e.proposal?.finalGrade?.gradeIndex ?? null,
        }));

        return (
          <Card key={cls.id}>
            <CardHeader>
              <CardTitle>
                {cls.code} – {cls.name}{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({cls.program.code}, {cls.semester} {cls.academicYear})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { accessorKey: "nim", header: "NIM" },
                  { accessorKey: "name", header: "Nama" },
                  {
                    accessorKey: "status",
                    header: "Status",
                    cell: ({ row }) => (
                      <StatusBadge status={row.original.status} type="proposal" />
                    ),
                  },
                  {
                    accessorKey: "bimbinganCount",
                    header: "Bimbingan",
                    cell: ({ row }) => (
                      <span className={row.original.bimbinganCount >= 3 ? "text-green-600 font-semibold" : "text-red-500"}>
                        {row.original.bimbinganCount}/3
                      </span>
                    ),
                  },
                  {
                    accessorKey: "eprtStatus",
                    header: "EpRT",
                    cell: ({ row }) =>
                      row.original.eprtStatus ? (
                        <StatusBadge status={row.original.eprtStatus} type="eprt" />
                      ) : (
                        <span className="text-gray-400 text-xs">Belum upload</span>
                      ),
                  },
                  { accessorKey: "deStatus", header: "DE" },
                  {
                    accessorKey: "nilaiAkhir",
                    header: "Nilai Akhir",
                    cell: ({ row }) =>
                      row.original.nilaiAkhir !== null ? (
                        <span className="font-semibold">
                          {row.original.nilaiAkhir.toFixed(1)} ({row.original.grade})
                        </span>
                      ) : (
                        <span className="text-gray-400">–</span>
                      ),
                  },
                ] as ColumnDef<typeof rows[number]>[]}
                data={rows}
                searchPlaceholder="Cari mahasiswa..."
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
