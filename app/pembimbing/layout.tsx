import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BookOpen,
  Presentation,
  CalendarPlus,
} from "lucide-react";

const navItems = [
  {
    href: "/pembimbing/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/mahasiswa",
    label: "Daftar Mahasiswa",
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

  if (!session?.user?.roles?.includes("PEMBIMBING")) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="PEMBIMBING"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
