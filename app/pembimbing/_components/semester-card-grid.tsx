import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Users, CheckCircle2 } from "lucide-react";

export type SemesterStat = {
  semester: string;
  academicYear: string;
  total: number;
  scored: number;
};

export function sortSemesters<T extends { semester: string; academicYear: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ay = parseInt(a.academicYear.split("/")[0], 10);
    const by = parseInt(b.academicYear.split("/")[0], 10);
    if (by !== ay) return by - ay;
    if (a.semester !== b.semester) return a.semester === "Genap" ? -1 : 1;
    return 0;
  });
}

export function SemesterCardGrid({
  semesters,
  basePath,
}: {
  semesters: SemesterStat[];
  basePath: string;
}) {
  if (semesters.length === 0) {
    return <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan kepada Anda.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {semesters.map((s) => {
        const label = `Semester ${s.semester} ${s.academicYear}`;
        const href = `${basePath}?semester=${encodeURIComponent(s.semester)}&year=${encodeURIComponent(s.academicYear)}`;
        const allDone = s.scored === s.total && s.total > 0;

        return (
          <Link key={`${s.semester}-${s.academicYear}`} href={href}>
            <Card className="hover:border-[#C8102E] hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">{label}</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{s.total} mahasiswa</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${allDone ? "text-green-500" : "text-gray-300"}`}
                      />
                      <span className={allDone ? "text-green-600 font-medium" : "text-gray-500"}>
                        {s.scored} / {s.total} telah dinilai
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
