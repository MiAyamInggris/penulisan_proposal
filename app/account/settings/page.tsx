import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountSettings } from "./account-settings";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola password dan email akun Anda
        </p>
      </div>
      <AccountSettings
        currentEmail={session.user.email}
        userName={session.user.name}
      />
    </div>
  );
}
