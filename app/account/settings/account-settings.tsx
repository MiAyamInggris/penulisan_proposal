"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword, changeEmail } from "./actions";
import { KeyRound, Mail } from "lucide-react";

export function AccountSettings({
  currentEmail,
  userName,
}: {
  currentEmail: string;
  userName: string;
}) {
  const [pwLoading, setPwLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwLoading(true);
    try {
      const result = await changePassword(new FormData(e.currentTarget));
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Password berhasil diubah");
        (e.target as HTMLFormElement).reset();
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const result = await changeEmail(new FormData(e.currentTarget));
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Email berhasil diubah. Silakan login ulang.");
        (e.target as HTMLFormElement).reset();
      }
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-sm text-gray-500">
          Akun: <span className="font-medium text-gray-900">{userName}</span>
        </p>
        <p className="text-sm text-gray-500">
          Email saat ini: <span className="font-medium text-gray-900">{currentEmail}</span>
        </p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Ubah Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                placeholder="Masukkan password saat ini"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Ulangi password baru"
              />
            </div>
            <Button
              type="submit"
              disabled={pwLoading}
              className="bg-[#C8102E] hover:bg-[#a50d26]"
            >
              {pwLoading ? "Menyimpan..." : "Ubah Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Ubah Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="newEmail">Email Baru</Label>
              <Input
                id="newEmail"
                name="newEmail"
                type="email"
                required
                placeholder="email@contoh.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="emailCurrentPassword">Konfirmasi dengan Password</Label>
              <Input
                id="emailCurrentPassword"
                name="currentPassword"
                type="password"
                required
                placeholder="Masukkan password Anda"
              />
            </div>
            <p className="text-xs text-gray-500">
              Setelah mengubah email, Anda perlu login ulang dengan email baru.
            </p>
            <Button
              type="submit"
              disabled={emailLoading}
              className="bg-[#C8102E] hover:bg-[#a50d26]"
            >
              {emailLoading ? "Menyimpan..." : "Ubah Email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
