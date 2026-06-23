import { prisma } from "@/lib/prisma";
import { UserTable } from "./user-table";

export default async function UsersPage() {
  const [usersRaw, kelompokKeahlianList, programList] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isKetua: true,
        isKaprodi: true,
        identifier: true,
        kodeDosen: true,
        kelompokKeahlianId: true,
        prodiId: true,
        createdAt: true,
        kelompokKeahlian: { select: { nama: true } },
        prodi: { select: { name: true, code: true } },
      },
    }),
    prisma.kelompokKeahlian.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
  ]);

  const users = usersRaw.map((u) => ({
    ...u,
    kelompokKeahlianNama: u.kelompokKeahlian?.nama ?? null,
    prodiName: u.prodi ? `${u.prodi.name} (${u.prodi.code})` : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola akun admin, dosen, dan mahasiswa
        </p>
      </div>
      <UserTable users={users} kelompokKeahlianList={kelompokKeahlianList} programList={programList} />
    </div>
  );
}
