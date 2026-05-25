import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AuditLogFilters,
  AuditLogTable,
  AuditLogPagination,
  type AuditLogRow,
} from "./audit-table";
import { Suspense } from "react";

const PAGE_SIZE = 25;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; action?: string; role?: string; page?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const { search = "", action = "", role = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);

  const where = {
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
          Riwayat aksi penting yang dilakukan oleh Kaprodi, Ketua KK, dan Admin.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Log ({total} entri)</span>
          </CardTitle>
          <Suspense>
            <AuditLogFilters search={search} action={action} role={role} />
          </Suspense>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense>
            <AuditLogTable rows={rows} />
            <AuditLogPagination page={page} totalPages={totalPages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
