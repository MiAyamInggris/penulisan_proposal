import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const ROLE_DASHBOARD: Record<string, string> = {
  MAHASISWA: "/mahasiswa/dashboard",
  DOSEN: "/dosen/dashboard",
  ADMIN: "/admin/dashboard",
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const dashboardHref = ROLE_DASHBOARD[session.user.role] ?? "/";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center gap-3">
        <Link
          href={dashboardHref}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-900">Pengaturan Akun</span>
      </header>
      <main className="p-6 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
