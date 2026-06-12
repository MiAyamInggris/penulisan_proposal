import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, Crown, BookMarked } from "lucide-react";
import { selectDosenRole, selectKetuaKKRole, selectKaprodiRole } from "./actions";
import { RoleSubmitButton, RolePendingOverlay } from "@/components/role-submit-button";

export default async function SelectRolePage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN") redirect("/login");

  const coordinatorClasses = await prisma.class.count({
    where: { dosenKelasId: session.user.id },
  });

  const isKetua = session.user.isKetua ?? false;
  const isKaprodi = session.user.isKaprodi ?? false;

  // Only auto-redirect to PEMBIMBING if dosen has no other roles
  if (coordinatorClasses === 0 && !isKetua && !isKaprodi) {
    await selectDosenRole("PEMBIMBING");
  }

  // Read current active context to highlight the active role
  const cookieStore = await cookies();
  const activeContext = cookieStore.get("dosen-context-role")?.value ?? null;

  const cardCount =
    1 +
    (coordinatorClasses > 0 ? 1 : 0) +
    (isKetua ? 1 : 0) +
    (isKaprodi ? 1 : 0);
  const gridClass =
    cardCount >= 3
      ? "grid grid-cols-1 md:grid-cols-3 gap-6"
      : "grid grid-cols-1 md:grid-cols-2 gap-6";

  const ActiveBadge = () => (
    <Badge className="absolute top-3 right-3 bg-green-100 text-green-700 text-xs px-2 py-0.5 pointer-events-none">
      Sedang Aktif
    </Badge>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#C8102E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Pilih Peran Anda</h1>
          <p className="text-gray-500 mt-2">
            Pilih peran yang ingin Anda gunakan. Peran yang sedang aktif ditandai dengan badge hijau.
          </p>
        </div>

        <div className={gridClass}>
          {/* Pembimbing card */}
          <form action={selectDosenRole.bind(null, "PEMBIMBING")}>
            <RoleSubmitButton className="w-full text-left group">
              <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl group-hover:-translate-y-1 ${
                activeContext === "PEMBIMBING" || (!activeContext && coordinatorClasses === 0)
                  ? "border-[#C8102E] shadow-md"
                  : "border-transparent hover:border-[#C8102E]"
              }`}>
                {(activeContext === "PEMBIMBING" || (!activeContext && coordinatorClasses === 0)) && <ActiveBadge />}
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
            </RoleSubmitButton>
            <RolePendingOverlay label="Pembimbing" />
          </form>

          {/* Koordinator card — only if dosen has classes */}
          {coordinatorClasses > 0 && (
            <form action={selectDosenRole.bind(null, "KOORDINATOR")}>
              <RoleSubmitButton className="w-full text-left group">
                <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl group-hover:-translate-y-1 ${
                  activeContext === "KOORDINATOR"
                    ? "border-[#C8102E] shadow-md"
                    : "border-transparent hover:border-[#C8102E]"
                }`}>
                  {activeContext === "KOORDINATOR" && <ActiveBadge />}
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
              </RoleSubmitButton>
              <RolePendingOverlay label="Dosen Pengampu Kelas" />
            </form>
          )}

          {/* Ketua KK card — only if assigned as Ketua */}
          {isKetua && (
            <form action={selectKetuaKKRole}>
              <RoleSubmitButton className="w-full text-left group">
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
              </RoleSubmitButton>
              <RolePendingOverlay label="Ketua KK" />
            </form>
          )}

          {/* Kaprodi card — only if assigned as Kaprodi */}
          {isKaprodi && (
            <form action={selectKaprodiRole}>
              <RoleSubmitButton className="w-full text-left group">
                <Card className="relative overflow-hidden border-2 border-transparent transition-all duration-300 hover:border-indigo-400 hover:shadow-xl group-hover:-translate-y-1">
                  <CardContent className="pt-8 pb-8 px-8">
                    <div className="mb-6 w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-100">
                      <BookMarked className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Kepala Program Studi</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Pantau statistik kelulusan, rekap nilai seluruh mahasiswa, dan monitor
                      progress kelas di program studi Anda.
                    </p>
                    <div className="mt-6 flex items-center text-sm font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Pilih Peran →
                    </div>
                  </CardContent>
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <BookMarked className="h-24 w-24" />
                  </div>
                </Card>
              </RoleSubmitButton>
              <RolePendingOverlay label="Kaprodi" />
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Gunakan tombol &ldquo;Ganti Peran&rdquo; di sidebar untuk berpindah kapan saja.
        </p>
      </div>
    </div>
  );
}
