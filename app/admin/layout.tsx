import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  School,
  Settings,
  RefreshCw,
  Crown,
} from "lucide-react";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/admin/users",
    label: "Manajemen Pengguna",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/admin/classes",
    label: "Manajemen Kelas",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    href: "/admin/enrollments",
    label: "Pendaftaran Mahasiswa",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    href: "/admin/programs",
    label: "Program Studi",
    icon: <School className="h-4 w-4" />,
  },
  {
    href: "/admin/dosen-sync",
    label: "Sinkronisasi Dosen",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  {
    href: "/admin/ketua-kk",
    label: "Ketua KK",
    icon: <Crown className="h-4 w-4" />,
  },
  {
    href: "/account/settings",
    label: "Pengaturan Akun",
    icon: <Settings className="h-4 w-4" />,
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="ADMIN"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
