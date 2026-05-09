import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  CalendarCheck,
  ShieldCheck,
  UserCheck,
  BarChart3,
  ClipboardList,
  Presentation,
  CalendarPlus,
} from "lucide-react";

const koordinatorNavItems = [
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

const pembimbingNavItems = [
  {
    href: "/dosen/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/dosen/pembimbing",
    label: "Mahasiswa Bimbingan",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/bimbingan",
    label: "Nilai Bimbingan",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/literature-review",
    label: "Literature Review",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/presentasi",
    label: "Nilai Presentasi",
    icon: <Presentation className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/seminar",
    label: "Jadwal Seminar",
    icon: <CalendarPlus className="h-4 w-4" />,
  },
];

void CalendarCheck;

export default async function DosenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "DOSEN") redirect("/login");

  const cookieStore = await cookies();
  const contextRole = cookieStore.get("dosen-context-role")?.value;

  if (!contextRole) {
    const coordinatorClasses = await prisma.class.count({
      where: { dosenKelasId: session.user.id },
    });

    if (coordinatorClasses > 0) {
      redirect("/dosen-select-role");
    }
  }

  const isKoordinator = contextRole === "KOORDINATOR";
  const roleLabel = isKoordinator ? "Dosen Pengampu" : "Pembimbing";
  const navItems = isKoordinator ? koordinatorNavItems : pembimbingNavItems;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role={roleLabel}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
