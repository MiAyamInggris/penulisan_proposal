import { prisma } from "@/lib/prisma";
import { EnrollmentManager } from "./enrollment-manager";

export default async function EnrollmentsPage() {
  const [classes, students] = await Promise.all([
    prisma.class.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        program: true,
        enrollments: {
          where: { isActive: true },
          include: { student: { select: { id: true, name: true, identifier: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { roles: { has: "MAHASISWA" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, identifier: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pendaftaran Mahasiswa</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tambahkan mahasiswa ke kelas
        </p>
      </div>
      <EnrollmentManager classes={classes} students={students} />
    </div>
  );
}
