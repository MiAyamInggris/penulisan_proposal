import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getMyProdi } from "@/lib/kaprodi";
import { HistoricalImportClient } from "./import-client";

export default async function KaprodiImportPage() {
  const session = await auth();
  if (!session || !session.user.isKaprodi) redirect("/login");

  const prodi = await getMyProdi(session.user.id);
  if (!prodi) redirect("/dosen-select-role");

  const classes = await prisma.class.findMany({
    where: { program: { id: prodi.id } },
    orderBy: [{ academicYear: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      semester: true,
      academicYear: true,
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data Historis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import data akademik historis untuk kelas di Program Studi{" "}
          <span className="font-semibold text-gray-700">{prodi.name} ({prodi.code})</span>
        </p>
      </div>
      <HistoricalImportClient classes={classes} />
    </div>
  );
}
