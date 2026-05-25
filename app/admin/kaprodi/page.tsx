import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KaprodiManager } from "./kaprodi-manager";

export default async function AdminKaprodiPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const [programs, dosenList] = await Promise.all([
    prisma.program.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        kaprodi: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Kaprodi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tetapkan Kepala Program Studi untuk setiap program studi.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Penetapan Kaprodi per Program Studi</CardTitle>
        </CardHeader>
        <CardContent>
          <KaprodiManager programs={programs} dosenList={dosenList} />
        </CardContent>
      </Card>
    </div>
  );
}
