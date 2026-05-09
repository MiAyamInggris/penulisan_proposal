import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  ShieldCheck,
  UserCheck,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

const navItems = [
  {
    href: "/dosen/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/dosen/kelas",
    label: "Kelas Saya",
    icon: <BookOpen className="h-4 w-4" />,
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

  if (session?.user?.role !== "DOSEN") redirect("/login");

  const cookieStore = await cookies();
  const contextRole = cookieStore.get("dosen-context-role")?.value;
  const roleSwitchTarget: "PEMBIMBING" | "KOORDINATOR" =
    contextRole === "PEMBIMBING" ? "KOORDINATOR" : "PEMBIMBING";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="Dosen Pengampu"
        roleSwitchTarget={roleSwitchTarget}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
