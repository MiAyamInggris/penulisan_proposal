import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, Crown } from "lucide-react";
import { selectDosenRole, selectKetuaKKRole } from "./actions";

export default async function SelectRolePage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN") redirect("/login");

  const coordinatorClasses = await prisma.class.count({
    where: { dosenKelasId: session.user.id },
  });

  const isKetua = session.user.isKetua ?? false;

  // Only auto-redirect to PEMBIMBING if dosen has no coordinator classes and is not Ketua KK
  if (coordinatorClasses === 0 && !isKetua) {
    await selectDosenRole("PEMBIMBING");
  }

  const cardCount = 1 + (coordinatorClasses > 0 ? 1 : 0) + (isKetua ? 1 : 0);
  const gridClass =
    cardCount === 3
      ? "grid grid-cols-1 md:grid-cols-3 gap-6"
      : "grid grid-cols-1 md:grid-cols-2 gap-6";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#C8102E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Pilih Peran Anda</h1>
          <p className="text-gray-500 mt-2">
            Silakan pilih peran yang ingin Anda gunakan untuk sesi ini.
          </p>
        </div>

        <div className={gridClass}>
          {/* Pembimbing card */}
          <form action={selectDosenRole.bind(null, "PEMBIMBING")}>
            <button className="w-full text-left group">
              <Card className="relative overflow-hidden border-2 border-transparent transition-all duration-300 hover:border-[#C8102E] hover:shadow-xl group-hover:-translate-y-1">
                <CardContent className="pt-8 pb-8 px-8">
                  <div className="mb-6 w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-100">
                    <Users className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pembimbing</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Akses dashboard untuk membimbing mahasiswa, menguji proposal, dan melakukan Desk
                    Evaluation.
                  </p>
                  <div className="mt-6 flex items-center text-sm font-semibold text-[#C8102E] opacity-0 transition-opacity group-hover:opacity-100">
                    Pilih Peran →
                  </div>
                </CardContent>
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Users className="h-24 w-24" />
                </div>
              </Card>
            </button>
          </form>

          {/* Koordinator card — only if dosen has classes */}
          {coordinatorClasses > 0 && (
            <form action={selectDosenRole.bind(null, "KOORDINATOR")}>
              <button className="w-full text-left group">
                <Card className="relative overflow-hidden border-2 border-transparent transition-all duration-300 hover:border-[#C8102E] hover:shadow-xl group-hover:-translate-y-1">
                  <CardContent className="pt-8 pb-8 px-8">
                    <div className="mb-6 w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 transition-colors group-hover:bg-purple-100">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Dosen Pengampu Kelas</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Kelola administrasi kelas, verifikasi EpRT, dan penugasan
                      pembimbing/desk evaluator.
                    </p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-[#C8102E] opacity-0 transition-opacity group-hover:opacity-100">
                      Pilih Peran →
                    </div>
                  </CardContent>
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <GraduationCap className="h-24 w-24" />
                  </div>
                </Card>
              </button>
            </form>
          )}

          {/* Ketua KK card — only if assigned as Ketua */}
          {isKetua && (
            <form action={selectKetuaKKRole}>
              <button className="w-full text-left group">
                <Card className="relative overflow-hidden border-2 border-transparent transition-all duration-300 hover:border-yellow-400 hover:shadow-xl group-hover:-translate-y-1">
                  <CardContent className="pt-8 pb-8 px-8">
                    <div className="mb-6 w-14 h-14 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 transition-colors group-hover:bg-yellow-100">
                      <Crown className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ketua Kelompok Keahlian</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Alokasi pembimbing untuk mahasiswa, pantau kuota dosen, dan monitor beban
                      bimbingan.
                    </p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-yellow-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Pilih Peran →
                    </div>
                  </CardContent>
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Crown className="h-24 w-24" />
                  </div>
                </Card>
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Anda dapat mengubah peran kapan saja melalui menu di dashboard.
        </p>
      </div>
    </div>
  );
}
