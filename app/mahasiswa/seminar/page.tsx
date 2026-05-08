import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SeminarRegister } from "./seminar-register";

export default async function MahasiswaSeminarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      proposal: {
        include: {
          bimbinganSessions: { select: { id: true } },
          seminar: {
            select: {
              status: true,
              scheduledDate: true,
              location: true,
            },
          },
        },
      },
      eprt: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seminar Proposal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daftar seminar setelah semua syarat terpenuhi
        </p>
      </div>
      <SeminarRegister enrollment={enrollment} />
    </div>
  );
}
