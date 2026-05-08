"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { registerProposal } from "./actions";

type Pembimbing = { id: string; name: string; identifier: string };

export function ProposalForm({ pembimbingList }: { pembimbingList: Pembimbing[] }) {
  const [loading, setLoading] = useState(false);
  const [supervisor1, setSupervisor1] = useState("");
  const [supervisor2, setSupervisor2] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (supervisor1) formData.set("supervisor1RequestedId", supervisor1);
    if (supervisor2) formData.set("supervisor2RequestedId", supervisor2);
    try {
      const result = await registerProposal(formData);
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Proposal berhasil didaftarkan!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftarkan Proposal TA</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="titleId">Judul Proposal (Bahasa Indonesia) *</Label>
            <Textarea
              id="titleId"
              name="titleId"
              placeholder="Masukkan judul proposal dalam Bahasa Indonesia"
              required
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="titleEn">Judul Proposal (Bahasa Inggris)</Label>
            <Textarea
              id="titleEn"
              name="titleEn"
              placeholder="Opsional – masukkan judul dalam Bahasa Inggris"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="topicArea">Bidang Topik</Label>
            <Input
              id="topicArea"
              name="topicArea"
              placeholder="Contoh: Machine Learning, Web Development, dll."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Pembimbing 1 (Usulan) *</Label>
              <Select onValueChange={(v: string | null) => { if (v) setSupervisor1(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pembimbing 1" />
                </SelectTrigger>
                <SelectContent>
                  {pembimbingList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Pembimbing 2 (Usulan, opsional)</Label>
              <Select onValueChange={(v: string | null) => { if (v) setSupervisor2(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pembimbing 2" />
                </SelectTrigger>
                <SelectContent>
                  {pembimbingList
                    .filter((p) => p.id !== supervisor1)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !supervisor1}
            className="bg-[#C8102E] hover:bg-[#a50d26]"
          >
            {loading ? "Mendaftarkan..." : "Daftarkan Proposal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
