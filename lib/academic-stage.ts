import { prisma } from "./prisma";
import { logAudit } from "./audit";

export async function maybePromoteAcademicStage(
  proposalId: string,
  passed: boolean | null,
  actor: { id: string; role: string }
): Promise<void> {
  if (passed !== true) return;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      academicStage: true,
      enrollment: {
        select: { student: { select: { name: true, identifier: true } } },
      },
    },
  });

  if (!proposal || proposal.academicStage === "TUGAS_AKHIR_2") return;

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { academicStage: "TUGAS_AKHIR_2" },
  });

  await logAudit(
    actor.id,
    actor.role,
    "ACADEMIC_STAGE_PROMOTION",
    {
      proposalId,
      mahasiswaName: proposal.enrollment.student.name,
      mahasiswaNim: proposal.enrollment.student.identifier,
      fromStage: "PENULISAN_PROPOSAL",
      toStage: "TUGAS_AKHIR_2",
      reason: "Lulus Penulisan Proposal",
    },
    "PROPOSAL",
    proposalId
  );
}
