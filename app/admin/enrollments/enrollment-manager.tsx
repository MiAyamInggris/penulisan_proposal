"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { enrollStudent, removeEnrollment } from "./actions";
import { BulkEnrollDialog } from "./bulk-enroll-dialog";
import { FileSpreadsheet, UserPlus, Users, Trash2 } from "lucide-react";

type ClassData = {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  program: { code: string };
  enrollments: Array<{
    id: string;
    student: { id: string; name: string; identifier: string };
  }>;
};

type Student = { id: string; name: string; identifier: string };

export function EnrollmentManager({
  classes,
  students,
}: {
  classes: ClassData[];
  students: Student[];
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const currentClass = classes.find((c) => c.id === selectedClass);

  const handleEnroll = async () => {
    if (!selectedClass || !selectedStudent) return;
    setLoading(true);
    try {
      const result = await enrollStudent(selectedClass, selectedStudent);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Mahasiswa berhasil didaftarkan");
        setSelectedStudent("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    if (!confirm("Hapus pendaftaran mahasiswa ini?")) return;
    try {
      await removeEnrollment(enrollmentId);
      toast.success("Pendaftaran berhasil dihapus");
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  return (
    <div className="space-y-4">
      {/* Import massal button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setBulkOpen(true)}
          className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import Massal dari Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Daftarkan Mahasiswa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Pilih Kelas</Label>
              <Select onValueChange={(v: string | null) => { if (v) setSelectedClass(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} – {c.name} ({c.program.code}, {c.academicYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Pilih Mahasiswa</Label>
              <Select onValueChange={(v: string | null) => { if (v) setSelectedStudent(v); }} value={selectedStudent || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mahasiswa..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.identifier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEnroll}
              disabled={!selectedClass || !selectedStudent || loading}
              className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
            >
              {loading ? "Mendaftarkan..." : "Daftarkan Mahasiswa"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar Mahasiswa{" "}
              {currentClass ? `– ${currentClass.code}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!currentClass ? (
              <p className="text-sm text-gray-500">Pilih kelas untuk melihat daftar mahasiswa</p>
            ) : currentClass.enrollments.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada mahasiswa terdaftar</p>
            ) : (
              <div className="space-y-2">
                {currentClass.enrollments.map((e, idx) => (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{e.student.name}</p>
                        <p className="text-xs text-gray-500">{e.student.identifier}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkEnrollDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        classes={classes}
      />
    </div>
  );
}
