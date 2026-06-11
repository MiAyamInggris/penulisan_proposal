import { prisma } from "@/lib/prisma";
import { HistoricalImportClient } from "@/components/historical-import-client";

export default async function KetuaKKImportPage() {
  const classes = await prisma.class.findMany({
    orderBy: [{ academicYear: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      semester: true,
      academicYear: true,
      program: { select: { code: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data Historis TA2</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import data akademik historis untuk kelas dari seluruh Program Studi
        </p>
      </div>
      <HistoricalImportClient classes={classes} />
    </div>
  );
}
