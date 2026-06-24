import { prisma } from "@/lib/prisma";
import { SidangWarningClient } from "@/components/sidang-warning-client";
import type { DosenRef, SidangWarningRow } from "@/app/ketua-kk/plotting-penguji/data-warning/page";

export default async function AdminPlottingPengujiWarningsPage() {
  const [warnings, dosenList, kkList] = await Promise.all([
    prisma.sidangImportWarning.findMany({
      orderBy: { createdAt: "desc" },
      include: { kelompokKeahlian: { select: { id: true, nama: true } } },
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kodeDosen: true, kelompokKeahlianId: true, kelompokKeahlian: { select: { nama: true } } },
    }),
    prisma.kelompokKeahlian.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
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
    kelompokKeahlianId: w.kelompokKeahlianId,
    kelompokKeahlianNama: w.kelompokKeahlian.nama,
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
        <h1 className="text-2xl font-bold text-gray-900">Data Warning Penguji</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seluruh data hasil import Plotting Penguji yang memerlukan konfirmasi, lintas semua Kelompok Keahlian.
          Admin dapat menyelesaikan warning secara langsung tanpa dibatasi kepemilikan KK.
        </p>
      </div>
      <SidangWarningClient rows={rows} dosenList={dosenOptions} kkFilterOptions={kkList} />
    </div>
  );
}
