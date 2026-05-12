import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { previewSync } from "./actions";
import { SyncClient } from "./sync-client";

export default async function DosenSyncPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const preview = await previewSync();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sinkronisasi Data Dosen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Perbarui data akun dosen berdasarkan data referensi terbaru (209 dosen).
          Dosen yang tidak ada di data referensi akan dinonaktifkan dan penugasannya akan dihapus.
        </p>
      </div>
      <SyncClient preview={preview} />
    </div>
  );
}
