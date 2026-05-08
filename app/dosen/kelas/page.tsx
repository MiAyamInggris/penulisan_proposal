import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";

export default async function DosenKelasListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const classes = await prisma.class.findMany({
    where: { dosenKelasId: session.user.id },
    include: {
      program: { select: { code: true } },
      enrollments: {
        where: { isActive: true },
        include: {
          proposal: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (classes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Kelas Saya</h1>
        <p className="text-gray-500">
          Anda belum ditetapkan sebagai dosen kelas manapun.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelas Saya</h1>
        <p className="text-sm text-gray-500 mt-1">{classes.length} kelas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map((cls) => {
          const total = cls.enrollments.length;
          const assigned = cls.enrollments.filter((e) =>
            [
              "ASSIGNED",
              "BIMBINGAN",
              "DE_READY",
              "DE_COMPLETED",
              "REVISION_UPLOADED",
              "SEMINAR_REGISTERED",
              "SEMINAR_COMPLETED",
              "COMPLETED",
            ].includes(e.proposal?.status ?? "")
          ).length;
          const completed = cls.enrollments.filter(
            (e) => e.proposal?.status === "COMPLETED"
          ).length;

          return (
            <Link key={cls.id} href={`/dosen/kelas/${cls.id}`}>
              <Card className="hover:border-[#C8102E] hover:shadow-sm transition-all cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{cls.code}</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {cls.enrollments[0]
                          ? `${cls.program.code} · ${cls.semester}`
                          : cls.program.code}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {total} mahasiswa
                    </span>
                    <span>{cls.academicYear}</span>
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {assigned} ditugaskan
                    </span>
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
                      {completed} selesai
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
