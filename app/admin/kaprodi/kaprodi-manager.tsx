"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { assignKaprodi, removeKaprodi } from "./actions";
import { UserCheck, X } from "lucide-react";

type Program = {
  id: string;
  name: string;
  code: string;
  kaprodi: { id: string; name: string; email: string } | null;
};

type Dosen = {
  id: string;
  name: string;
  email: string;
};

export function KaprodiManager({
  programs,
  dosenList,
}: {
  programs: Program[];
  dosenList: Dosen[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const handleAssign = async (programId: string) => {
    const dosenId = selections[programId];
    if (!dosenId) return;

    setLoading(programId);
    const result = await assignKaprodi(dosenId, programId);
    setLoading(null);

    if ("error" in result) {
      toast.error(`Gagal: ${result.error}`);
    } else {
      toast.success("Kaprodi berhasil ditetapkan.");
      setSelections((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== programId)));
      router.refresh();
    }
  };

  const handleRemove = async (programId: string) => {
    if (!window.confirm("Hapus Kaprodi dari program studi ini?")) return;

    setLoading(programId + "-remove");
    const result = await removeKaprodi(programId);
    setLoading(null);

    if ("error" in result) {
      toast.error(`Gagal: ${result.error}`);
    } else {
      toast.success("Kaprodi berhasil dihapus.");
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {programs.map((program) => (
        <Card key={program.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {program.name}{" "}
                <Badge variant="outline" className="ml-2 text-xs">
                  {program.code}
                </Badge>
              </span>
              {program.kaprodi && (
                <span className="flex items-center gap-1 text-green-600 text-sm font-normal">
                  <UserCheck className="h-4 w-4" />
                  Aktif
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {program.kaprodi ? (
              <div className="flex items-center justify-between rounded-md border bg-green-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {program.kaprodi.name}
                  </p>
                  <p className="text-xs text-gray-500">{program.kaprodi.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={loading === program.id + "-remove"}
                  onClick={() => handleRemove(program.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Hapus
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Belum ada Kaprodi</p>
            )}

            <div className="flex gap-2">
              <Select
                value={selections[program.id] ?? ""}
                onValueChange={(v) => {
                  if (v) setSelections((prev) => ({ ...prev, [program.id]: v }));
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih dosen..." />
                </SelectTrigger>
                <SelectContent>
                  {dosenList.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selections[program.id] || loading === program.id}
                onClick={() => handleAssign(program.id)}
                className="bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {loading === program.id ? "Menyimpan..." : "Tetapkan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
