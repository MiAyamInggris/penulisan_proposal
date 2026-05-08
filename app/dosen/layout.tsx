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
    href: "/dosen/pembimbing",
    label: "Mahasiswa Bimbingan",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/desk-evaluation",
    label: "Desk Evaluation",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/seminar",
    label: "Seminar",
    icon: <CalendarCheck className="h-4 w-4" />,
  },
];

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

  const roleLabel = contextRole === "KOORDINATOR" ? "Dosen Pengampu" : "Dosen";

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
