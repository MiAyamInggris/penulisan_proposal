import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, ClipboardList, GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function DosenDashboard() {
  const session = await auth();
  const dosenId = session!.user.id;

  const [classesAsKelas, supervisedProposals, deskEvalProposals] =
    await Promise.all([
      prisma.class.findMany({
        where: { dosenKelasId: dosenId },
        include: {
          program: true,
          _count: { select: { enrollments: { where: { isActive: true } } } },
        },
      }),
      prisma.proposal.findMany({
        where: {
          OR: [
            { supervisor1AssignedId: dosenId },
            { supervisor2AssignedId: dosenId },
          ],
        },
        include: {
          enrollment: {
            include: { student: { select: { name: true, identifier: true } } },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.proposal.findMany({
        where: { deskEvaluatorId: dosenId },
        include: {
          enrollment: {
            include: { student: { select: { name: true, identifier: true } } },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const stats = [
    {
      title: "Kelas Diampu",
      value: classesAsKelas.length,
      icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50",
      href: "/dosen-kelas/kelas",
    },
    {
      title: "Mahasiswa Bimbingan",
      value: supervisedProposals.length,
      icon: <Users className="h-5 w-5 text-green-600" />,
      bg: "bg-green-50",
      href: "/dosen-kelas/supervisor",
    },
    {
      title: "Tugas Desk Evaluasi",
      value: deskEvalProposals.length,
      icon: <ClipboardList className="h-5 w-5 text-orange-600" />,
      bg: "bg-orange-50",
      href: "/dosen-kelas/desk-evaluator",
    },
    {
      title: "Total Mahasiswa",
      value: classesAsKelas.reduce((s, c) => s + c._count.enrollments, 0),
      icon: <GraduationCap className="h-5 w-5 text-purple-600" />,
      bg: "bg-purple-50",
      href: "/dosen-kelas/kelas",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Dosen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selamat datang, {session!.user.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kelas yang Diampu</CardTitle>
          </CardHeader>
          <CardContent>
            {classesAsKelas.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada kelas yang diampu</p>
            ) : (
              <div className="space-y-2">
                {classesAsKelas.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                      <p className="text-xs text-gray-500">
                        {cls.program.code} · {cls.semester} {cls.academicYear}
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {cls._count.enrollments} mhs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bimbingan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {supervisedProposals.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada mahasiswa bimbingan</p>
            ) : (
              <div className="space-y-2">
                {supervisedProposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.enrollment.student.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {p.titleId}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
