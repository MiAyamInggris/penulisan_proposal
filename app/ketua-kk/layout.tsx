import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { LayoutDashboard, Users, Sliders, Settings, Upload, UserX, GraduationCap, Shield } from "lucide-react";

const navItems = [
  {
    href: "/ketua-kk/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/ketua-kk/alokasi-pembimbing",
    label: "Alokasi Pembimbing",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/ketua-kk/mahasiswa-belum-pembimbing",
    label: "Mahasiswa Belum Memiliki Pembimbing",
    icon: <UserX className="h-4 w-4" />,
  },
  {
    href: "/ketua-kk/update-lulus",
    label: "Update Mahasiswa Lulus",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    href: "/ketua-kk/plotting-sidang",
    label: "Plotting Sidang",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    href: "/ketua-kk/kuota",
    label: "Kuota Pembimbing",
    icon: <Sliders className="h-4 w-4" />,
  },
  {
    href: "/ketua-kk/import",
    label: "Import Kuota Historis TA2",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    href: "/account/settings",
    label: "Pengaturan Akun",
    icon: <Settings className="h-4 w-4" />,
  },
];

export default async function KetuaKKLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "DOSEN" || !session.user.isKetua) {
    redirect("/dosen-kelas/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="Ketua Kelompok Keahlian"
        showRoleSwitch
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
