import { prisma } from "@/lib/prisma";
import { ProgramCard } from "./program-card";

export default async function ProgramsPage() {
  const programs = await prisma.program.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Program Studi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bobot penilaian per program studi (sesuai panduan 2024)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((p) => (
          <ProgramCard key={p.id} program={p} />
        ))}
      </div>
    </div>
  );
}
