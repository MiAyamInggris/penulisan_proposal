import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "BULK_IMPORT_HISTORICAL"
  | "ASSIGN_KAPRODI"
  | "REMOVE_KAPRODI"
  | "ASSIGN_PEMBIMBING_KK"
  | "KK_SYNC"
  | "DOSEN_SYNC";

export async function logAudit(
  userId: string,
  userRole: string,
  action: AuditAction | string,
  detail?: Record<string, unknown>,
  entityType?: string,
  entityId?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId, userRole, action, entityType, entityId,
        detail: detail ? (detail as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    // Audit log failure must never break the primary action
  }
}
