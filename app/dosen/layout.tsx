import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  Star,
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
    href: "/pembimbing/supervisor",
    label: "Mahasiswa Saya",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/desk-evaluation",
    label: "Desk Evaluation",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    href: "/pembimbing/nilai",
    label: "Penilaian",
    icon: <Star className="h-4 w-4" />,
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="DOSEN"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
