import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  ClipboardList,
  GraduationCap,
  Bell,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default async function DosenDashboard() {
  const session = await auth();
  const dosenId = session!.user.id;

  const [classesAsKelas, supervisedProposals, deskEvalProposals, notifications] =
    await Promise.all([
      prisma.class.findMany({
        where: { dosenKelasId: dosenId },
        include: {
          program: { select: { code: true } },
          enrollments: {
            where: { isActive: true },
            include: {
              eprt: { select: { status: true } },
              proposal: { select: { status: true } },
            },
          },
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
            include: {
              student: { select: { name: true, identifier: true } },
            },
          },
          seminar: { select: { scheduledDate: true, status: true } },
          nilaiBimbingan: {
            where: { pembimbingId: dosenId },
            select: { id: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.proposal.findMany({
        where: { deskEvaluatorId: dosenId },
        include: {
          enrollment: {
            include: {
              student: { select: { name: true, identifier: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { recipientId: dosenId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const totalStudents = classesAsKelas.reduce(
    (s, c) => s + c.enrollments.length,
    0
  );
  const pendingEprt = classesAsKelas.reduce(
    (s, c) => s + c.enrollments.filter((e) => e.eprt?.status === "PENDING").length,
    0
  );

  const seminarPending = supervisedProposals.filter(
    (p) =>
      p.status === "SEMINAR_REGISTERED" && !p.seminar?.scheduledDate
  );
  const deReady = deskEvalProposals.filter((p) => p.status === "DE_READY");

  const stats = [
    {
      title: "Kelas Diampu",
      value: classesAsKelas.length,
      icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50",
      href: "/dosen/kelas",
      badge: pendingEprt > 0 ? `${pendingEprt} EpRT` : null,
    },
    {
      title: "Mahasiswa Bimbingan",
      value: supervisedProposals.length,
      icon: <Users className="h-5 w-5 text-green-600" />,
      bg: "bg-green-50",
      href: "/dosen/pembimbing",
      badge: seminarPending.length > 0 ? `${seminarPending.length} seminar` : null,
    },
    {
      title: "Tugas Desk Evaluasi",
      value: deskEvalProposals.length,
      icon: <ClipboardList className="h-5 w-5 text-orange-600" />,
      bg: "bg-orange-50",
      href: "/pembimbing/desk-evaluation",
      badge: deReady.length > 0 ? `${deReady.length} menunggu` : null,
    },
    {
      title: "Total Mahasiswa",
      value: totalStudents,
      icon: <GraduationCap className="h-5 w-5 text-purple-600" />,
      bg: "bg-purple-50",
      href: "/dosen/kelas",
      badge: null,
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                    {stat.badge && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">
                        {stat.badge}
                      </span>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alert: Actions Needed */}
      {(seminarPending.length > 0 || deReady.length > 0 || pendingEprt > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-amber-900">
                Tindakan Diperlukan
              </p>
            </div>
            <div className="space-y-1 text-sm text-amber-800 ml-7">
              {seminarPending.length > 0 && (
                <p>
                  • {seminarPending.length} mahasiswa perlu dijadwalkan seminar →{" "}
                  <Link href="/dosen/pembimbing" className="underline">
                    Buka
                  </Link>
                </p>
              )}
              {deReady.length > 0 && (
                <p>
                  • {deReady.length} proposal siap dinilai Desk Evaluation →{" "}
                  <Link href="/pembimbing/desk-evaluation" className="underline">
                    Buka
                  </Link>
                </p>
              )}
              {pendingEprt > 0 && (
                <p>
                  • {pendingEprt} EpRT menunggu verifikasi →{" "}
                  <Link href="/dosen-kelas/eprt" className="underline">
                    Buka
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Kelas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kelas yang Diampu</CardTitle>
              <Link
                href="/dosen/kelas"
                className="text-xs text-[#C8102E] hover:underline"
              >
                Lihat semua
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {classesAsKelas.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada kelas</p>
            ) : (
              <div className="space-y-2">
                {classesAsKelas.map((cls) => {
                  const eprtPending = cls.enrollments.filter(
                    (e) => e.eprt?.status === "PENDING"
                  ).length;
                  return (
                    <Link key={cls.id} href={`/dosen/kelas/${cls.id}`}>
                      <div className="flex justify-between items-center py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {cls.code}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cls.program.code} · {cls.enrollments.length} mhs
                          </p>
                        </div>
                        {eprtPending > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                          >
                            {eprtPending} EpRT
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Bimbingan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Mahasiswa Bimbingan</CardTitle>
              <Link
                href="/dosen/pembimbing"
                className="text-xs text-[#C8102E] hover:underline"
              >
                Lihat semua
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {supervisedProposals.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada mahasiswa bimbingan</p>
            ) : (
              <div className="space-y-2">
                {supervisedProposals.slice(0, 5).map((p) => {
                  const needsSeminar =
                    p.status === "SEMINAR_REGISTERED" &&
                    !p.seminar?.scheduledDate;
                  return (
                    <Link key={p.id} href={`/dosen/pembimbing/${p.id}`}>
                      <div className="flex justify-between items-center py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {p.enrollment.student.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.enrollment.student.identifier}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {needsSeminar && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                            >
                              Seminar
                            </Badge>
                          )}
                          <StatusBadge status={p.status} type="proposal" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: DE + Notifications */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Desk Evaluasi</CardTitle>
                <Link
                  href="/pembimbing/desk-evaluation"
                  className="text-xs text-[#C8102E] hover:underline"
                >
                  Buka
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {deskEvalProposals.length === 0 ? (
                <p className="text-sm text-gray-400">Tidak ada tugas DE</p>
              ) : (
                <div className="space-y-2">
                  {deskEvalProposals.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center py-1.5"
                    >
                      <p className="text-sm text-gray-700 truncate max-w-[160px]">
                        {p.enrollment.student.name}
                      </p>
                      <StatusBadge status={p.status} type="proposal" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {notifications.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <CardTitle className="text-base">
                    Notifikasi ({notifications.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="text-sm text-gray-700 py-1.5 border-b last:border-0"
                    >
                      <p className="font-medium text-gray-900 text-xs">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
