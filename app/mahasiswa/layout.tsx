import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Upload,
  Star,
  FilePen,
  Presentation,
} from "lucide-react";

const navItems = [
  {
    href: "/mahasiswa/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/mahasiswa/proposal",
    label: "Proposal Saya",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/mahasiswa/bimbingan",
    label: "Log Bimbingan",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    href: "/mahasiswa/eprt",
    label: "EpRT",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    href: "/mahasiswa/revisi",
    label: "Revisi",
    icon: <FilePen className="h-4 w-4" />,
  },
  {
    href: "/mahasiswa/seminar",
    label: "Seminar",
    icon: <Presentation className="h-4 w-4" />,
  },
  {
    href: "/mahasiswa/nilai",
    label: "Nilai Saya",
    icon: <Star className="h-4 w-4" />,
  },
];

export default async function MahasiswaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "MAHASISWA") redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="MAHASISWA"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
