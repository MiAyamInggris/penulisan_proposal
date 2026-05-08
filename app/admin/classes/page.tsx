import { prisma } from "@/lib/prisma";
import { ClassTable } from "./class-table";

export default async function ClassesPage() {
  const [classes, programs, dosenKelasUsers] = await Promise.all([
    prisma.class.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        program: true,
        dosenKelas: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.program.findMany({ orderBy: { code: "asc" } }),
    prisma.user.findMany({
      where: { roles: { has: "DOSEN_KELAS" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Kelas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola kelas mata kuliah penulisan proposal
        </p>
      </div>
      <ClassTable classes={classes} programs={programs} dosenKelasUsers={dosenKelasUsers} />
    </div>
  );
}
