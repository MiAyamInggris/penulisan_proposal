import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, ClipboardList } from "lucide-react";

export default async function AdminDashboard() {
  const [userCount, classCount, enrollmentCount, proposalsByProgram] =
    await Promise.all([
      prisma.user.count(),
      prisma.class.count(),
      prisma.classEnrollment.count({ where: { isActive: true } }),
      prisma.proposal.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

  const stats = [
    {
      title: "Total Pengguna",
      value: userCount,
      icon: <Users className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      title: "Total Kelas",
      value: classCount,
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      bg: "bg-green-50",
    },
    {
      title: "Total Mahasiswa Aktif",
      value: enrollmentCount,
      icon: <GraduationCap className="h-5 w-5 text-purple-600" />,
      bg: "bg-purple-50",
    },
    {
      title: "Total Proposal",
      value: proposalsByProgram.reduce((sum, p) => sum + p._count.id, 0),
      icon: <ClipboardList className="h-5 w-5 text-[#C8102E]" />,
      bg: "bg-red-50",
    },
  ];

  const statusLabels: Record<string, string> = {
    ENROLLED: "Terdaftar",
    PROPOSAL_UPLOADED: "Proposal Diunggah",
    ASSIGNED: "Pembimbing Ditugaskan",
    BIMBINGAN: "Bimbingan",
    DE_READY: "Siap DE",
    DE_COMPLETED: "DE Selesai",
    REVISION_UPLOADED: "Revisi Diunggah",
    SEMINAR_REGISTERED: "Daftar Seminar",
    SEMINAR_COMPLETED: "Seminar Selesai",
    COMPLETED: "Selesai",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan sistem penulisan proposal TA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          {proposalsByProgram.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada proposal terdaftar</p>
          ) : (
            <div className="space-y-2">
              {proposalsByProgram.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm text-gray-600">
                    {statusLabels[item.status] ?? item.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item._count.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
