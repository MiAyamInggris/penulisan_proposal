import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { LayoutDashboard, TableProperties, Upload, Settings } from "lucide-react";

const navItems = [
  {
    href: "/kaprodi/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/kaprodi/rekap",
    label: "Rekap Nilai",
    icon: <TableProperties className="h-4 w-4" />,
  },
  {
    href: "/kaprodi/import",
    label: "Import Historis",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    href: "/account/settings",
    label: "Pengaturan Akun",
    icon: <Settings className="h-4 w-4" />,
  },
];

export default async function KaprodiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "DOSEN" || !session.user.isKaprodi) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        userEmail={session.user.email}
        userName={session.user.name}
        role="Kaprodi"
        showRoleSwitch
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
