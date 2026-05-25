"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, ArrowLeftRight } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  navItems: NavItem[];
  userEmail: string;
  userName: string;
  role: string;
  showRoleSwitch?: boolean;
}

export function Sidebar({ navItems, userEmail, userName, role, showRoleSwitch }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    DOSEN: "Dosen",
    MAHASISWA: "Mahasiswa",
    "Dosen Pengampu": "Dosen Pengampu",
    Pembimbing: "Pembimbing",
    "Ketua Kelompok Keahlian": "Ketua Kelompok Keahlian",
    Kaprodi: "Kepala Program Studi",
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-[#C8102E] rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white text-base font-bold">T</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            Proposal TA
          </p>
          <p className="text-xs text-gray-500 truncate">Tel-U Purwokerto</p>
        </div>
        <button
          className="ml-auto md:hidden text-gray-400 hover:text-gray-600"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#C8102E] text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <div className="px-3">
          <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {roleLabels[role] ?? role}
          </span>
        </div>
        {showRoleSwitch && (
          <Link
            href="/dosen-select-role"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            Ganti Peran
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
        <SidebarContent />
      </div>

      {/* Mobile: top bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-white border-b border-gray-200">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-600 hover:text-gray-900 mr-3"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#C8102E] rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">Proposal TA</p>
        </div>
      </div>

      {/* Mobile: slide-in drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
