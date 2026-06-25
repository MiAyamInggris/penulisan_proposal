import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "BULK_IMPORT_HISTORICAL"
  | "BULK_IMPORT_HISTORICAL_QUOTA"
  | "ASSIGN_KAPRODI"
  | "REMOVE_KAPRODI"
  | "ASSIGN_PEMBIMBING_KK"
  | "KK_SYNC"
  | "DOSEN_SYNC"
  | "SCORE_CREATE"
  | "SCORE_UPDATE"
  | "ACADEMIC_STAGE_PROMOTION"
  | "GRADUATE_UPDATE_IMPORT"
  | "GRADUATE_STUDENT"
  | "SIDANG_IMPORT_BULK"
  | "ASSIGN_PENGUJI_SIDANG"
  | "REASSIGN_PENGUJI_SIDANG"
  | "ASSIGNMENT_UPDATED"
  | "CROSS_KK_EXAMINER_ASSIGNMENT"
  | "FORCE_INSERT_PENGUJI"
  | "IGNORE_SIDANG_WARNING"
  | "BULK_ACCEPT_SIDANG_WARNING"
  | "BULK_IGNORE_SIDANG_WARNING";

export type AssignmentChange = { field: string; previous: string; new: string };

export type AssessmentType =
  | "NILAI_BIMBINGAN"
  | "NILAI_LR"
  | "DESK_EVALUATION"
  | "NILAI_PRESENTASI";

export type DosenRole = "PEMBIMBING_1" | "PEMBIMBING_2" | "DESK_EVALUATOR";

export interface ScoreAuditDetail {
  assessmentType: AssessmentType;
  proposalId: string;
  mahasiswaName: string;
  mahasiswaNim: string;
  classCode: string;
  /** Assessor name — same as user.name for manual entry; differs for bulk import */
  dosenName?: string;
  dosenRole: DosenRole | string;
  isUpdate: boolean;
  previousTotal: number | null;
  newTotal: number;
  previousFields: Record<string, number> | null;
  newFields: Record<string, number>;
  source: "MANUAL" | "BULK_IMPORT";
  /** Set when source = BULK_IMPORT */
  importedBy?: string;
}

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
