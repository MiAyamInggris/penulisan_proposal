import { prisma } from "@/lib/prisma";

const TA_PAST_CODE = "TA-PAST";
const TA_PAST_NAME = "Tugas Akhir - Past";

/**
 * Returns the per-program "Tugas Akhir - Past" system class, creating it on
 * first use. This class is a hidden container for students imported via the
 * Ketua KK Historical Quota Import — it is excluded from normal class
 * listings, Proposal Class management, and Rekap Nilai.
 */
export async function getOrCreateTAPastClass(
  programId: string,
  fallbackDosenId: string
): Promise<{ id: string }> {
  const existing = await prisma.class.findFirst({
    where: { programId, isSystemClass: true, code: TA_PAST_CODE },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.class.create({
    data: {
      code: TA_PAST_CODE,
      name: TA_PAST_NAME,
      semester: "-",
      academicYear: "-",
      programId,
      dosenKelasId: fallbackDosenId,
      isSystemClass: true,
    },
    select: { id: true },
  });
}
