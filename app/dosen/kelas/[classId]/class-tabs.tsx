"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import {
  assignSupervisors,
  verifyEprt,
  rejectEprt,
  setDeDeadline,
} from "@/lib/actions/dosenKelas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Pembimbing = { id: string; name: string };

type Enrollment = {
  id: string;
  student: { id: string; name: string; identifier: string };
  proposal: {
    id: string;
    status: string;
    titleId: string;
    supervisor1Requested: { id: string; name: string } | null;
    supervisor2Requested: { id: string; name: string } | null;
    supervisor1Assigned: { id: string; name: string } | null;
    supervisor2Assigned: { id: string; name: string } | null;
    deskEvaluator: { id: string; name: string } | null;
    bimbinganSessions: { id: string }[];
    deskEvaluation: {
      latarBelakang: number;
      formulasiMasalah: number;
      teoriPendukung: number;
      ideMetode: number;
      isLate: boolean;
      catatanReviewer: string | null;
    } | null;
    seminar: { status: string; scheduledDate: Date | null } | null;
    finalGrade: { weightedTotal: number | null; gradeIndex: string | null } | null;
  } | null;
  eprt: {
    id: string;
    eprtDate: Date;
    screenshotUrl: string;
    status: string;
  } | null;
};

type Cls = {
  id: string;
  code: string;
  deDeadline: Date | null;
  enrollments: Enrollment[];
};

const TABS = [
  { key: "mahasiswa", label: "Mahasiswa" },
  { key: "eprt", label: "EpRT" },
  { key: "pembimbing", label: "Pembimbing" },
  { key: "monitoring", label: "Monitoring" },
  { key: "pengaturan", label: "Pengaturan" },
];

export function ClassTabs({
  cls,
  pembimbingList,
  activeTab,
}: {
  cls: Cls;
  pembimbingList: Pembimbing[];
  activeTab: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const setTab = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-[#C8102E] text-[#C8102E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "mahasiswa" && <MahasiswaTab enrollments={cls.enrollments} />}
      {activeTab === "eprt" && <EprtTab enrollments={cls.enrollments} />}
      {activeTab === "pembimbing" && (
        <PembimbingTab enrollments={cls.enrollments} pembimbingList={pembimbingList} />
      )}
      {activeTab === "monitoring" && <MonitoringTab enrollments={cls.enrollments} />}
      {activeTab === "pengaturan" && (
        <PengaturanTab classId={cls.id} deDeadline={cls.deDeadline} />
      )}
    </div>
  );
}

function MahasiswaTab({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0)
    return <p className="text-gray-500">Belum ada mahasiswa terdaftar.</p>;

  return (
    <div className="space-y-2">
      {enrollments.map((e) => (
        <Card key={e.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{e.student.name}</span>
                  <span className="text-xs text-gray-400">{e.student.identifier}</span>
                </div>
                {e.proposal && (
                  <p className="text-sm text-gray-500 line-clamp-1">{e.proposal.titleId}</p>
                )}
              </div>
              <div className="shrink-0">
                <StatusBadge status={e.proposal?.status ?? "ENROLLED"} type="proposal" />
              </div>
            </div>
            <div className="mt-2 flex gap-3 text-xs text-gray-500">
              <span>Bimbingan: {e.proposal?.bimbinganSessions.length ?? 0}/3</span>
              <span>EpRT: {e.eprt?.status ?? "–"}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EprtTab({ enrollments }: { enrollments: Enrollment[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  const pending = enrollments.filter((e) => e.eprt?.status === "PENDING");
  const verified = enrollments.filter((e) => e.eprt?.status === "VERIFIED");

  const handleVerify = async (eprtId: string) => {
    setLoading(eprtId);
    try {
      const result = await verifyEprt(eprtId);
      if ("error" in result) toast.error(String(result.error));
      else toast.success("EpRT berhasil diverifikasi");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (eprtId: string) => {
    setLoading(eprtId);
    try {
      const result = await rejectEprt(eprtId);
      if ("error" in result) toast.error(String(result.error));
      else toast.success("EpRT ditolak dan dihapus");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {pending.length === 0 && verified.length === 0 && (
        <p className="text-gray-500">Belum ada EpRT yang diupload.</p>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            Menunggu Verifikasi ({pending.length})
          </p>
          {pending.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{e.student.name}</p>
                    <p className="text-xs text-gray-400">{e.student.identifier}</p>
                    {e.eprt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Tanggal EpRT:{" "}
                        {format(new Date(e.eprt.eprtDate), "dd MMM yyyy", {
                          locale: idLocale,
                        })}
                      </p>
                    )}
                    {e.eprt?.screenshotUrl && (
                      <a
                        href={e.eprt.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 block"
                      >
                        Lihat Screenshot
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={loading === e.eprt?.id}
                      onClick={() => e.eprt && handleVerify(e.eprt.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Verifikasi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading === e.eprt?.id}
                      onClick={() => e.eprt && handleReject(e.eprt.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {verified.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            Terverifikasi ({verified.length})
          </p>
          {verified.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{e.student.name}</p>
                    <p className="text-xs text-gray-400">{e.student.identifier}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    VERIFIED
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PembimbingTab({
  enrollments,
  pembimbingList,
}: {
  enrollments: Enrollment[];
  pembimbingList: Pembimbing[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selections, setSelections] = useState<
    Record<string, { sup1: string; sup2: string }>
  >({});

  const getSel = (pid: string) =>
    selections[pid] ?? {
      sup1: enrollments.find((e) => e.proposal?.id === pid)?.proposal?.supervisor1Assigned?.id ?? "",
      sup2: enrollments.find((e) => e.proposal?.id === pid)?.proposal?.supervisor2Assigned?.id ?? "",
    };

  const setSel = (pid: string, key: "sup1" | "sup2", val: string) =>
    setSelections((prev) => ({
      ...prev,
      [pid]: { ...getSel(pid), [key]: val },
    }));

  const handleAssign = async (proposalId: string) => {
    const sel = getSel(proposalId);
    if (!sel.sup1) {
      toast.error("Pembimbing 1 wajib dipilih");
      return;
    }
    setLoading(proposalId);
    try {
      const result = await assignSupervisors(
        proposalId,
        sel.sup1,
        sel.sup2 || null
      );
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Pembimbing berhasil ditugaskan");
    } finally {
      setLoading(null);
    }
  };

  const needsAssignment = enrollments.filter(
    (e) =>
      e.proposal &&
      ["ENROLLED", "PROPOSAL_UPLOADED"].includes(e.proposal.status)
  );

  if (needsAssignment.length === 0)
    return (
      <p className="text-gray-500">Semua proposal sudah ditugaskan pembimbing.</p>
    );

  return (
    <div className="space-y-3">
      {needsAssignment.map((e) => {
        if (!e.proposal) return null;
        const pid = e.proposal.id;
        const sel = getSel(pid);

        return (
          <Card key={e.id}>
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="font-medium text-sm">{e.student.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{e.student.identifier}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {e.proposal.titleId}
                </p>
              </div>
              {(e.proposal.supervisor1Requested || e.proposal.supervisor2Requested) && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>
                    Usulan 1:{" "}
                    <span className="text-gray-700">
                      {e.proposal.supervisor1Requested?.name ?? "–"}
                    </span>
                  </p>
                  <p>
                    Usulan 2:{" "}
                    <span className="text-gray-700">
                      {e.proposal.supervisor2Requested?.name ?? "–"}
                    </span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Pembimbing 1 *</p>
                  <Select
                    value={sel.sup1 || "none"}
                    onValueChange={(v) => v && v !== "none" && setSel(pid, "sup1", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">– Pilih –</SelectItem>
                      {pembimbingList.map((pb) => (
                        <SelectItem key={pb.id} value={pb.id}>
                          {pb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Pembimbing 2</p>
                  <Select
                    value={sel.sup2 || "none"}
                    onValueChange={(v) => v !== null && setSel(pid, "sup2", v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">– Tidak Ada –</SelectItem>
                      {pembimbingList
                        .filter((pb) => pb.id !== sel.sup1)
                        .map((pb) => (
                          <SelectItem key={pb.id} value={pb.id}>
                            {pb.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleAssign(pid)}
                disabled={loading === pid || !sel.sup1 || sel.sup1 === "none"}
                className="bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {loading === pid ? "Menyimpan..." : "Tugaskan Pembimbing"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MonitoringTab({ enrollments }: { enrollments: Enrollment[] }) {
  const statusGroups: Record<string, Enrollment[]> = {};
  for (const e of enrollments) {
    const s = e.proposal?.status ?? "ENROLLED";
    if (!statusGroups[s]) statusGroups[s] = [];
    statusGroups[s].push(e);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Belum Upload", key: "ENROLLED", color: "gray" },
          { label: "Bimbingan", key: "BIMBINGAN", color: "yellow" },
          { label: "Siap DE", key: "DE_READY", color: "orange" },
          { label: "DE Selesai", key: "DE_COMPLETED", color: "purple" },
          { label: "Revisi", key: "REVISION_UPLOADED", color: "cyan" },
          { label: "Seminar", key: "SEMINAR_REGISTERED", color: "pink" },
          { label: "Selesai", key: "COMPLETED", color: "green" },
        ].map(({ label, key, color }) => (
          <Card key={key}>
            <CardContent className="pt-4 pb-3 text-center">
              <p
                className={`text-2xl font-bold text-${color}-600`}
              >
                {statusGroups[key]?.length ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {enrollments.map((e) => {
          const de = e.proposal?.deskEvaluation;
          const deScore = de
            ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
            : null;

          return (
            <Card key={e.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.student.name}</p>
                    <p className="text-xs text-gray-400">{e.student.identifier}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <StatusBadge
                      status={e.proposal?.status ?? "ENROLLED"}
                      type="proposal"
                    />
                    {e.proposal?.finalGrade?.gradeIndex && (
                      <span className="text-sm font-bold text-green-700">
                        {e.proposal.finalGrade.gradeIndex}
                      </span>
                    )}
                    {deScore !== null && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        DE: {deScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PengaturanTab({
  classId,
  deDeadline,
}: {
  classId: string;
  deDeadline: Date | null;
}) {
  const [deadline, setDeadline] = useState(
    deDeadline
      ? new Date(deDeadline).toISOString().slice(0, 16)
      : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!deadline) return;
    setLoading(true);
    try {
      const result = await setDeDeadline(classId, deadline);
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Deadline DE berhasil disimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Deadline Desk Evaluation
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Atur batas waktu pengumpulan Desk Evaluation untuk kelas ini.
            </p>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || !deadline}
            className="bg-[#C8102E] hover:bg-[#a50d26]"
          >
            {loading ? "Menyimpan..." : "Simpan Deadline"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
