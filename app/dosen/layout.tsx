import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
} from "lucide-react";

const navItems = [
  {
    href: "/dosen/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/kelas",
    label: "Kelas Saya",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/supervisor",
    label: "Mahasiswa Saya",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/dosen-kelas/desk-evaluator",
    label: "Evaluasi",
    icon: <ClipboardCheck className="h-4 w-4" />,
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
