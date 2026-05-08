import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EprtUpload } from "./eprt-upload";

export default async function EprtPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: { eprt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">EpRT (English Proficiency)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload bukti nilai EpRT Anda untuk memenuhi syarat Desk Evaluation
        </p>
      </div>
      {!enrollment ? (
        <p className="text-gray-500">Anda belum terdaftar di kelas manapun.</p>
      ) : (
        <EprtUpload eprt={enrollment.eprt} />
      )}
    </div>
  );
}
