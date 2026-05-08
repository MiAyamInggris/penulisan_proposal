import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RevisiUpload } from "./revisi-upload";

export default async function RevisiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      proposal: {
        include: {
          deskEvaluation: {
            include: { evaluator: { select: { name: true } } },
          },
        },
      },
    },
  });

  const proposal = enrollment?.proposal;

  if (!proposal) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Revisi Proposal</h1>
        <p className="text-gray-500">Daftarkan proposal terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revisi Proposal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lihat hasil Desk Evaluation dan unggah revisi proposal
        </p>
      </div>
      <RevisiUpload proposal={proposal} />
    </div>
  );
}
