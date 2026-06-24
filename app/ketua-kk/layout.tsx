import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { getMyNotifications } from "@/lib/actions/notifications";
import { getMyKK } from "@/lib/kk";
import { prisma } from "@/lib/prisma";
import { LayoutDashboard, Users, Sliders, Settings, Upload, UserX, GraduationCap, Shield } from "lucide-react";

export default async function KetuaKKLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "DOSEN" || !session.user.isKetua) {
    redirect("/dosen-kelas/dashboard");
  }

  const myKK = await getMyKK(session.user.id);
  const [notifications, pendingWarningCount] = await Promise.all([
    getMyNotifications(session.user.id),
    myKK
      ? prisma.sidangImportWarning.count({ where: { kelompokKeahlianId: myKK.id, status: "PENDING" } })
      : Promise.resolve(0),
  ]);

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
      href: "/ketua-kk/plotting-penguji",
      label: "Plotting Penguji",
      icon: <Shield className="h-4 w-4" />,
      badge: pendingWarningCount,
      children: [
        {
          href: "/ketua-kk/plotting-penguji/data-warning",
          label: "Data Warning & Confirmation",
          badge: pendingWarningCount,
        },
        {
          href: "/ketua-kk/plotting-penguji/beban-dosen",
          label: "Beban Dosen Penguji",
        },
      ],
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="Ketua Kelompok Keahlian"
        showRoleSwitch
        headerExtra={<NotificationBell userId={session.user.id} initialNotifications={notifications} />}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
