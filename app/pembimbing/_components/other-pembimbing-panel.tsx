"use client";

import { CheckCircle2, Clock } from "lucide-react";

export interface OtherScoreData {
  items: { label: string; value: number; max: number }[];
  notes?: string | null;
  total: number;
  updatedAt: string;
}

export interface OtherPembimbingData {
  name: string;
  role: "Pembimbing 1" | "Pembimbing 2";
  /** null = has not submitted yet */
  score: OtherScoreData | null;
}

export function OtherPembimbingPanel({ data }: { data: OtherPembimbingData }) {
  const submitted = data.score !== null;

  return (
    <div className={`mt-3 rounded-lg border text-sm ${submitted ? "border-blue-100 bg-blue-50/50" : "border-gray-200 bg-gray-50"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          {submitted ? (
            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
          ) : (
            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
          )}
          <span className="font-medium text-gray-700">
            Nilai {data.role}
          </span>
          <span className="text-gray-500">—</span>
          <span className="text-gray-700">{data.name}</span>
        </div>
        {submitted ? (
          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
            {data.score!.total.toFixed(1)} / 100
          </span>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Belum Input
          </span>
        )}
      </div>

      {/* Body */}
      {!submitted ? (
        <p className="px-4 py-3 text-sm text-gray-500">
          {data.role} belum melakukan input nilai.
        </p>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {/* Score rows */}
          <div className="divide-y divide-gray-100">
            {data.score!.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-gray-600 text-xs">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Maks {item.max}</span>
                  <span className="w-10 text-right font-medium tabular-nums">
                    {item.value.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {data.score!.notes && (
            <div className="rounded bg-white border border-blue-100 px-3 py-2">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Catatan:</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{data.score!.notes}</p>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-gray-400">
            Diperbarui:{" "}
            {new Date(data.score!.updatedAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
