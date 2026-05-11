import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  ClipboardEdit,
  Presentation,
  CalendarPlus,
} from "lucide-react";

const baseNavItems = [
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

export default async function PembimbingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "DOSEN") redirect("/login");

  const [coordinatorClasses, assignedDECount] = await Promise.all([
    prisma.class.count({ where: { dosenKelasId: session.user.id } }),
    prisma.proposal.count({ where: { deskEvaluatorId: session.user.id } }),
  ]);

  const navItems =
    assignedDECount > 0
      ? [
          ...baseNavItems,
          {
            href: "/dosen/desk-evaluation-assessment",
            label: "Desk Evaluation Assessment",
            icon: <ClipboardEdit className="h-4 w-4" />,
          },
        ]
      : baseNavItems;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="Pembimbing"
        roleSwitchTarget={coordinatorClasses > 0 ? "KOORDINATOR" : undefined}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
