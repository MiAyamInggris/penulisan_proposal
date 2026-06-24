"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { NotificationType } from "@prisma/client";

type Notif = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

const CROSS_KK_CATEGORY: Partial<Record<NotificationType, { label: string; color: string }>> = {
  PENGUJI_CROSS_KK_NEW: { label: "Penguji Baru", color: "bg-green-100 text-green-700" },
  PENGUJI_CROSS_KK_REMOVED: { label: "Penguji Dihapus", color: "bg-red-100 text-red-700" },
  PENGUJI_CROSS_KK_CHANGED: { label: "Penguji Diganti", color: "bg-amber-100 text-amber-700" },
};

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: Notif[];
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C8102E] text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold text-sm">Notifikasi</p>
            {unread > 0 && (
              <button
                onClick={handleReadAll}
                className="text-xs text-[#C8102E] hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">
                Tidak ada notifikasi
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && handleRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !n.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p
                      className={`text-sm font-medium ${
                        !n.isRead ? "text-gray-900" : "text-gray-600"
                      }`}
                    >
                      {n.title}
                    </p>
                    {CROSS_KK_CATEGORY[n.type] && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CROSS_KK_CATEGORY[n.type]!.color}`}>
                        {CROSS_KK_CATEGORY[n.type]!.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: idLocale,
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
