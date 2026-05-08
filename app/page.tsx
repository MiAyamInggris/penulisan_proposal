import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const roles = session.user.roles ?? [];

  if (roles.includes("ADMIN")) redirect("/admin/dashboard");
  if (roles.includes("DOSEN_KELAS")) redirect("/dosen-kelas/dashboard");
  if (roles.includes("PEMBIMBING")) redirect("/pembimbing/dashboard");
  if (roles.includes("MAHASISWA")) redirect("/mahasiswa/dashboard");

  redirect("/login");
}
