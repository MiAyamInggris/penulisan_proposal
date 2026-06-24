import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyKK } from "@/lib/kk";
import { SidangWarningClient } from "@/components/sidang-warning-client";

export type DosenRef = { id: string; name: string; kodeDosen: string | null } | null;

export type SidangWarningRow = {
  id: string;
  nim: string;
  nama: string;
  prodi: string;
  judul: string | null;
  kelompokKeahlianId: string;
  kelompokKeahlianNama: string;
  semester: string | null;
  method: string;
  status: string;
  warningType: string;
  warningMessages: string[];
  pembimbing1: DosenRef;
  pembimbing2: DosenRef;
  existingPenguji1: DosenRef;
  existingPenguji2: DosenRef;
  importedPenguji1: DosenRef;
  importedPenguji2: DosenRef;
  createdAt: string;
  resolvedAt: string | null;
};

export default async function DataWarningPage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.isKetua) {
    redirect("/ketua-kk/dashboard");
  }

  const myKK = await getMyKK(session.user.id);
  if (!myKK) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Warning &amp; Confirmation</h1>
        </div>
        <p className="text-sm text-gray-400 py-8 text-center">
          Anda belum terdaftar sebagai Ketua Kelompok Keahlian manapun.
        </p>
      </div>
    );
  }

  const [warnings, dosenList] = await Promise.all([
    prisma.sidangImportWarning.findMany({
      where: { kelompokKeahlianId: myKK.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kodeDosen: true, kelompokKeahlianId: true, kelompokKeahlian: { select: { nama: true } } },
    }),
  ]);

  const dosenIds = new Set<string>();
  for (const w of warnings) {
    for (const id of [w.pembimbing1Id, w.pembimbing2Id, w.existingPenguji1Id, w.existingPenguji2Id, w.importedPenguji1Id, w.importedPenguji2Id]) {
      if (id) dosenIds.add(id);
    }
  }
  const dosenDetails = await prisma.user.findMany({
    where: { id: { in: [...dosenIds] } },
    select: { id: true, name: true, kodeDosen: true },
  });
  const dosenById = new Map(dosenDetails.map((d) => [d.id, d]));
  const ref = (id: string | null): DosenRef => (id ? dosenById.get(id) ?? null : null);

  const rows: SidangWarningRow[] = warnings.map((w) => ({
    id: w.id,
    nim: w.nim,
    nama: w.nama,
    prodi: w.prodi,
    judul: w.judul,
    kelompokKeahlianId: myKK.id,
    kelompokKeahlianNama: myKK.nama,
    semester: w.semester,
    method: w.method,
    status: w.status,
    warningType: w.warningType,
    warningMessages: Array.isArray(w.warningMessages) ? (w.warningMessages as string[]) : [],
    pembimbing1: ref(w.pembimbing1Id),
    pembimbing2: ref(w.pembimbing2Id),
    existingPenguji1: ref(w.existingPenguji1Id),
    existingPenguji2: ref(w.existingPenguji2Id),
    importedPenguji1: ref(w.importedPenguji1Id),
    importedPenguji2: ref(w.importedPenguji2Id),
    createdAt: w.createdAt.toISOString(),
    resolvedAt: w.resolvedAt?.toISOString() ?? null,
  }));

  const dosenOptions = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    kodeDosen: d.kodeDosen,
    kelompokKeahlianId: d.kelompokKeahlianId,
    kelompokKeahlianNama: d.kelompokKeahlian?.nama ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Warning &amp; Confirmation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tinjau data hasil import yang memiliki konflik atau memerlukan konfirmasi — {myKK.nama}.
        </p>
      </div>
      <SidangWarningClient rows={rows} dosenList={dosenOptions} />
    </div>
  );
}
