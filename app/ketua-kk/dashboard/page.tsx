import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";
import { getMyKK } from "@/lib/kk";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default async function KetuaKKDashboard() {
  const session = await auth();
  const myKK = await getMyKK(session!.user.id);

  if (!myKK) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ketua KK</h1>
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Anda belum ditugaskan ke Kelompok Keahlian</p>
            <p className="text-sm mt-1">
              Hubungi Admin untuk mendapatkan penugasan Kelompok Keahlian.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [dosenList, globalQuota] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true, kelompokKeahlianId: myKK.id },
      select: {
        id: true,
        name: true,
        identifier: true,
        isKetua: true,
        supervisedAsFirst: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: { id: true },
        },
        supervisedAsSecond: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: { id: true },
        },
        assignedDeskEvals: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    getGlobalQuota(),
  ]);

  const rows = dosenList.map((d) => {
    const bimbinganCount = d.supervisedAsFirst.length + d.supervisedAsSecond.length;
    const deCount = d.assignedDeskEvals.length;
    const usage = bimbinganCount / (globalQuota || 1);
    const status = usage >= 1 ? "penuh" : usage >= 0.7 ? "hampir penuh" : "tersedia";
    return { ...d, bimbinganCount, deCount, usage, status };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ketua KK</h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{myKK.nama}</span> · monitoring beban
          bimbingan (kuota global: {globalQuota} per dosen)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Dosen dalam KK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Dosen Penuh</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {rows.filter((r) => r.status === "penuh").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Dosen Tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {rows.filter((r) => r.status === "tersedia").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beban Bimbingan Dosen — {myKK.nama}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dosen</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Bimbingan</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Kuota ({globalQuota})
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">DE</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Belum ada dosen dalam Kelompok Keahlian ini
                    </td>
                  </tr>
                ) : (
                  rows.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {d.name}
                        {d.isKetua && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                            Ketua KK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{d.identifier}</td>
                      <td className="px-4 py-3 text-center font-medium">{d.bimbinganCount}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{globalQuota}</td>
                      <td className="px-4 py-3 text-center">{d.deCount}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={d.status === "penuh" ? "destructive" : d.status === "hampir penuh" ? "secondary" : "default"}
                          className={
                            d.status === "tersedia"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : d.status === "hampir penuh"
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                              : ""
                          }
                        >
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
