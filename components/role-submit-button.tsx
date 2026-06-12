"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoleSubmitButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(className, pending && "opacity-60 pointer-events-none")}
    >
      {children}
    </button>
  );
}

export function RolePendingOverlay({ label }: { label: string }) {
  const { pending } = useFormStatus();

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#C8102E]" />
        <p className="text-sm font-medium text-gray-700">
          Memuat Dashboard {label}...
        </p>
      </div>
    </div>
  );
}
