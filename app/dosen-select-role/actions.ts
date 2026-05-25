"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectDosenRole(role: "PEMBIMBING" | "KOORDINATOR") {
  const cookieStore = await cookies();
  cookieStore.set("dosen-context-role", role, {
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
  });
  redirect("/dosen/dashboard");
}

export async function switchDosenContext(
  role: "PEMBIMBING" | "KOORDINATOR",
  dest: string
) {
  const cookieStore = await cookies();
  cookieStore.set("dosen-context-role", role, {
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  redirect(dest);
}

export async function clearDosenRole() {
  const cookieStore = await cookies();
  cookieStore.delete("dosen-context-role");
  redirect("/dosen-select-role");
}

export async function selectKetuaKKRole() {
  redirect("/ketua-kk/dashboard");
}

export async function selectKaprodiRole() {
  redirect("/kaprodi/dashboard");
}
