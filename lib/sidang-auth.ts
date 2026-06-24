import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireKetuaOrAdminForSidang() {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");
  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) throw new Error("Tidak terautentikasi");

  let myKKId: string | null = null;
  if (!isAdmin) {
    const myKK = await prisma.kelompokKeahlian.findUnique({
      where: { ketuaId: session.user.id },
      select: { id: true },
    });
    myKKId = myKK?.id ?? null;
  }

  const auditRole: "ADMIN" | "KETUA_KK" = isAdmin ? "ADMIN" : "KETUA_KK";
  return { session, auditRole, isAdmin, myKKId };
}
