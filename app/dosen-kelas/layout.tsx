import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  UserCheck,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

const navItems = [
  {
    href: "/dosen-kelas/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/kelas",
    label: "Detail Kelas",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/eprt",
    label: "Verifikasi EpRT",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/supervisor",
    label: "Penugasan Pembimbing",
    icon: <UserCheck className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/desk-evaluation",
    label: "Desk Evaluation",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/nilai",
    label: "Rekap Nilai",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export default async function DosenKelasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.roles?.includes("DOSEN_KELAS")) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="DOSEN_KELAS"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
