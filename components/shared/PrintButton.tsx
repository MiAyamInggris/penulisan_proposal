"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Cetak / Export PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        background: "#1d4ed8",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      <Printer size={16} />
      {label}
    </button>
  );
}
