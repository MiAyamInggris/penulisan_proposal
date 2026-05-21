"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Crown,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Check,
  X,
  Users,
  BookOpen,
} from "lucide-react";
import {
  createKelompokKeahlian,
  updateKKNama,
  deleteKK,
  assignDosenToKK,
  removeDosenFromKK,
  setKetuaKK,
} from "./actions";

export type KKData = {
  id: string;
  nama: string;
  ketuaId: string | null;
  ketua: { id: string; name: string; identifier: string } | null;
  dosen: Array<{ id: string; name: string; identifier: string; isKetua: boolean }>;
};

export type DosenData = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  kelompokKeahlianId: string | null;
};

export function KKManager({
  kkList,
  allDosen,
}: {
  kkList: KKData[];
  allDosen: DosenData[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(kkList[0]?.id ?? null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  // Edit name
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Ketua selector
  const [ketuaSelect, setKetuaSelect] = useState<string>("");

  // Saving states
  const [saving, setSaving] = useState(false);

  const refresh = () => router.refresh();

  const selectedKK = kkList.find((k) => k.id === selectedId) ?? null;
  const kkMembers = allDosen.filter((d) => d.kelompokKeahlianId === selectedId);
  const availableDosen = allDosen.filter((d) => d.kelompokKeahlianId !== selectedId);
  const [addDosenId, setAddDosenId] = useState("");

  const run = async (fn: () => Promise<{ error?: string; success?: boolean }>) => {
    setSaving(true);
    try {
      const res = await fn();
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Berhasil disimpan"); refresh(); }
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setSaving(false); }
  };

  const handleCreate = () =>
    run(async () => {
      const res = await createKelompokKeahlian(newName);
      if (!("error" in res)) setNewName("");
      return res;
    });

  const handleRename = (kkId: string) =>
    run(async () => {
      const res = await updateKKNama(kkId, editName);
      if (!("error" in res)) setEditingId(null);
      return res;
    });

  const handleDelete = (kkId: string, memberCount: number) => {
    if (memberCount > 0) {
      toast.error("Hapus semua anggota terlebih dahulu");
      return;
    }
    if (!confirm("Hapus Kelompok Keahlian ini?")) return;
    run(async () => {
      const res = await deleteKK(kkId);
      if (!("error" in res) && selectedId === kkId) setSelectedId(null);
      return res;
    });
  };

  const handleAddDosen = () => {
    if (!selectedId || !addDosenId) return;
    run(async () => {
      const res = await assignDosenToKK(addDosenId, selectedId);
      if (!("error" in res)) setAddDosenId("");
      return res;
    });
  };

  const handleRemoveDosen = (dosenId: string) =>
    run(() => removeDosenFromKK(dosenId));

  const handleSetKetua = () => {
    if (!selectedId) return;
    const val = ketuaSelect === "__none__" ? null : ketuaSelect || null;
    run(async () => {
      const res = await setKetuaKK(selectedId, val);
      if (!("error" in res)) setKetuaSelect("");
      return res;
    });
  };

  const unassignedCount = allDosen.filter((d) => !d.kelompokKeahlianId).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left panel: KK list ── */}
      <div className="space-y-3">
        {/* Create form */}
        {showCreate ? (
          <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Nama Kelompok Keahlian</p>
            <Input
              placeholder="KK Artificial Intelligence..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}
                className="bg-[#C8102E] hover:bg-[#a50d26] flex-1">
                <Check className="h-3.5 w-3.5 mr-1" /> Buat
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setNewName(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full"
            onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Buat Kelompok Keahlian
          </Button>
        )}

        {/* Summary chip */}
        {unassignedCount > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <strong>{unassignedCount}</strong> dosen belum masuk KK
          </div>
        )}

        {/* KK cards */}
        {kkList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada KK</p>
        ) : (
          <div className="space-y-2">
            {kkList.map((kk) => (
              <div
                key={kk.id}
                onClick={() => { setSelectedId(kk.id); setEditingId(null); setKetuaSelect(""); setAddDosenId(""); }}
                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                  selectedId === kk.id
                    ? "border-[#C8102E] bg-red-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {editingId === kk.id ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(kk.id); }}
                      autoFocus className="h-7 text-sm" />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleRename(kk.id)} disabled={saving}
                        className="h-6 px-2 text-xs bg-[#C8102E] hover:bg-[#a50d26]">
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}
                        className="h-6 px-2 text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{kk.nama}</p>
                      <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingId(kk.id); setEditName(kk.nama); }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDelete(kk.id, kk.dosen.length)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {kk.dosen.length} dosen
                      </span>
                      {kk.ketua ? (
                        <span className="text-xs text-yellow-700 flex items-center gap-0.5">
                          <Crown className="h-3 w-3" /> {kk.ketua.name.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Belum ada ketua</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: selected KK detail ── */}
      <div className="lg:col-span-2">
        {!selectedKK ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Pilih Kelompok Keahlian untuk kelola anggota</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedKK.nama}</h2>
                <p className="text-sm text-gray-500">
                  {kkMembers.length} anggota
                  {selectedKK.ketua ? ` · Ketua: ${selectedKK.ketua.name}` : " · Belum ada Ketua KK"}
                </p>
              </div>
            </div>

            {/* Set Ketua KK */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-semibold text-yellow-900">Penugasan Ketua KK</p>
              </div>
              {selectedKK.ketua && (
                <div className="flex items-center gap-2 text-sm text-yellow-800">
                  <Crown className="h-3.5 w-3.5 text-yellow-600" />
                  <span>Ketua saat ini: <strong>{selectedKK.ketua.name}</strong></span>
                  <span className="text-yellow-600 text-xs">({selectedKK.ketua.identifier})</span>
                </div>
              )}
              {kkMembers.length === 0 ? (
                <p className="text-xs text-yellow-700 italic">
                  Tambahkan anggota terlebih dahulu untuk menetapkan Ketua KK
                </p>
              ) : (
                <div className="flex gap-2 items-center flex-wrap">
                  <Select value={ketuaSelect} onValueChange={(v) => { if (v) setKetuaSelect(v); }}>
                    <SelectTrigger className="w-56 h-8 text-sm bg-white">
                      <SelectValue placeholder="Pilih Ketua KK..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">– Tidak ada –</SelectItem>
                      {kkMembers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.identifier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleSetKetua}
                    disabled={saving || !ketuaSelect}
                    className="h-8 bg-yellow-500 hover:bg-yellow-600 text-white">
                    <Crown className="h-3.5 w-3.5 mr-1" /> Tetapkan
                  </Button>
                </div>
              )}
            </div>

            {/* Member list */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Anggota Dosen
                </p>
                <Badge variant="secondary">{kkMembers.length}</Badge>
              </div>

              {kkMembers.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                  Belum ada dosen dalam KK ini
                </p>
              ) : (
                <div className="divide-y">
                  {kkMembers.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {d.id === selectedKK.ketuaId && (
                          <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-500">{d.identifier}</p>
                        </div>
                        {d.id === selectedKK.ketuaId && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                            Ketua KK
                          </Badge>
                        )}
                      </div>
                      <Button size="sm" variant="ghost"
                        onClick={() => handleRemoveDosen(d.id)}
                        disabled={saving}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2">
                        <UserMinus className="h-3.5 w-3.5 mr-1" /> Keluarkan
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add dosen section */}
              <div className="border-t px-4 py-3 bg-gray-50 flex gap-2 items-center flex-wrap">
                <Select value={addDosenId} onValueChange={(v) => { if (v) setAddDosenId(v); }}>
                  <SelectTrigger className="flex-1 min-w-48 h-8 text-sm bg-white">
                    <SelectValue placeholder="Tambah dosen ke KK ini..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDosen.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Semua dosen sudah dalam KK
                      </div>
                    ) : (
                      availableDosen.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.identifier})
                          {d.kelompokKeahlianId && (
                            <span className="text-gray-400 ml-1 text-xs">
                              · pindah dari KK lain
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddDosen}
                  disabled={saving || !addDosenId}
                  className="h-8 bg-[#C8102E] hover:bg-[#a50d26]">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Tambah
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
