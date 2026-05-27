import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AuditLogFilters,
  AuditLogTable,
  AuditLogPagination,
  ScoreLogFilters,
  ScoreLogTable,
  ViewTabs,
  type AuditLogRow,
} from "./audit-table";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

const SCORE_ACTIONS = ["SCORE_CREATE", "SCORE_UPDATE"];

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    action?: string;
    role?: string;
    page?: string;
    // score view filters
    view?: string;
    mahasiswa?: string;
    assessmentType?: string;
    modified?: string;
    dosen?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const {
    search = "",
    action = "",
    role = "",
    page: pageStr = "1",
    view = "admin",
    mahasiswa = "",
    assessmentType = "",
    modified = "",
    dosen = "",
    dateFrom = "",
    dateTo = "",
  } = await searchParams;

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const isScoreView = view === "scores";

  let where: Prisma.AuditLogWhereInput;

  if (isScoreView) {
    const andConditions: Prisma.AuditLogWhereInput[] = [];

    if (mahasiswa) {
      andConditions.push({
        OR: [
          { detail: { path: ["mahasiswaNim"], string_contains: mahasiswa } },
          { detail: { path: ["mahasiswaName"], string_contains: mahasiswa } },
        ],
      });
    }
    if (assessmentType) {
      andConditions.push({ detail: { path: ["assessmentType"], equals: assessmentType } });
    }
    if (dosen) {
      andConditions.push({ user: { name: { contains: dosen, mode: "insensitive" } } });
    }
    if (dateFrom) {
      andConditions.push({ createdAt: { gte: new Date(dateFrom) } });
    }
    if (dateTo) {
      andConditions.push({ createdAt: { lte: new Date(dateTo + "T23:59:59") } });
    }

    where = {
      action: modified === "1" ? "SCORE_UPDATE" : { in: SCORE_ACTIONS },
      ...(andConditions.length > 0 && { AND: andConditions }),
    };
  } else {
    where = {
      NOT: { action: { in: SCORE_ACTIONS } },
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }),
      ...(action && { action }),
      ...(role && { userRole: role }),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        userRole: true,
        entityType: true,
        entityId: true,
        detail: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows: AuditLogRow[] = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Riwayat aksi penting dan log penilaian mahasiswa.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Log ({total} entri)</span>
          </CardTitle>
          <Suspense>
            <ViewTabs view={view} />
          </Suspense>
          <Suspense>
            {isScoreView ? (
              <ScoreLogFilters
                mahasiswa={mahasiswa}
                assessmentType={assessmentType}
                modified={modified}
                dosen={dosen}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            ) : (
              <AuditLogFilters search={search} action={action} role={role} />
            )}
          </Suspense>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense>
            {isScoreView ? (
              <ScoreLogTable rows={rows} />
            ) : (
              <AuditLogTable rows={rows} />
            )}
            <AuditLogPagination page={page} totalPages={totalPages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
