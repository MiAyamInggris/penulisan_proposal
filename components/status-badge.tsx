import { cn } from "@/lib/utils";

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Terdaftar",
  PROPOSAL_UPLOADED: "Proposal Terdaftar",
  ASSIGNED: "Pembimbing Ditugaskan",
  BIMBINGAN: "Bimbingan",
  DE_READY: "Siap DE",
  DE_COMPLETED: "DE Selesai",
  REVISION_UPLOADED: "Revisi Diunggah",
  SEMINAR_REGISTERED: "Daftar Seminar",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  ENROLLED: "bg-gray-100 text-gray-700",
  PROPOSAL_UPLOADED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-indigo-100 text-indigo-700",
  BIMBINGAN: "bg-yellow-100 text-yellow-700",
  DE_READY: "bg-orange-100 text-orange-700",
  DE_COMPLETED: "bg-purple-100 text-purple-700",
  REVISION_UPLOADED: "bg-cyan-100 text-cyan-700",
  SEMINAR_REGISTERED: "bg-pink-100 text-pink-700",
  SEMINAR_COMPLETED: "bg-lime-100 text-lime-700",
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

export function StatusBadge({ status, type = "proposal", className }: StatusBadgeProps) {
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
