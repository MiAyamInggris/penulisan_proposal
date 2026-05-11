import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DEForm } from "./de-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function DEFormPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { proposalId } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true, deDeadline: true } },
        },
      },
      deskEvaluation: true,
    },
  });

  if (!proposal || proposal.deskEvaluatorId !== session.user.id) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dosen/desk-evaluation-assessment">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Desk Evaluation Assessment</h1>
          <p className="text-sm text-gray-500">
            Penilaian Proposal: {proposal.enrollment.student.name} ({proposal.enrollment.student.identifier})
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Informasi Proposal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <p className="text-gray-500">Judul (ID)</p>
              <p className="font-medium">{proposal.titleId}</p>
            </div>
            <div>
              <p className="text-gray-500">Kelas</p>
              <p className="font-medium">{proposal.enrollment.class.code}</p>
            </div>
            {proposal.proposalUrl && (
              <div className="md:col-span-2">
                <p className="text-gray-500 mb-1">File Proposal</p>
                <a 
                  href={proposal.proposalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium flex items-center gap-2"
                >
                  Lihat Proposal (External Link)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <DEForm proposal={proposal} />
    </div>
  );
}
