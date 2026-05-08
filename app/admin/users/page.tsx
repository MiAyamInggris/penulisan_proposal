import { prisma } from "@/lib/prisma";
import { UserTable } from "./user-table";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      identifier: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola akun admin, dosen, dan mahasiswa
        </p>
      </div>
      <UserTable users={users} />
    </div>
  );
}
