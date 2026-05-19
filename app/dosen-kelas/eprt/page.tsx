import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EprtVerifyList } from "./eprt-verify-list";

export default async function EprtVerifyPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClassIds = (
    await prisma.class.findMany({
      where: { dosenKelasId: session.user.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const allEprts = await prisma.eprtRecord.findMany({
    where: {
      enrollment: { classId: { in: myClassIds }, isActive: true },
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true, name: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pending = allEprts.filter((e) => e.status === "PENDING");
  const verified = allEprts.filter((e) => e.status === "VERIFIED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verifikasi EpRT</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length > 0
            ? `${pending.length} EpRT menunggu verifikasi`
            : "Semua EpRT sudah diverifikasi"}
        </p>
      </div>
      <EprtVerifyList pending={pending} verified={verified} />
    </div>
  );
}
