import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Terdaftar",
  BIMBINGAN: "Bimbingan",
  DE_SUBMITTED: "Dikumpul ke DE",
  DE_SCORED: "DE Dinilai",
  DE_REVISED: "Revisi DE",
  SEMINAR_SCHEDULED: "Seminar Dijadwalkan",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  ENROLLED: "bg-gray-100 text-gray-700",
  BIMBINGAN: "bg-blue-100 text-blue-700",
  DE_SUBMITTED: "bg-yellow-100 text-yellow-700",
  DE_SCORED: "bg-orange-100 text-orange-700",
  DE_REVISED: "bg-purple-100 text-purple-700",
  SEMINAR_SCHEDULED: "bg-indigo-100 text-indigo-700",
  SEMINAR_COMPLETED: "bg-teal-100 text-teal-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const EPRT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
};

const EPRT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
};

interface StatusBadgeProps {
  status: string;
  type?: "proposal" | "eprt" | "seminar";
  className?: string;
}

export function StatusBadge({
  status,
  type = "proposal",
  className,
}: StatusBadgeProps) {
  let label = status;
  let colorClass = "bg-gray-100 text-gray-700";

  if (type === "proposal") {
    label = PROPOSAL_STATUS_LABELS[status] ?? status;
    colorClass = PROPOSAL_STATUS_COLORS[status] ?? colorClass;
  } else if (type === "eprt") {
    label = EPRT_STATUS_LABELS[status] ?? status;
    colorClass = EPRT_STATUS_COLORS[status] ?? colorClass;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
