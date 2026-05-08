import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "ADMIN") redirect("/admin/dashboard");
  if (role === "DOSEN") redirect("/dosen/dashboard");
  if (role === "MAHASISWA") redirect("/mahasiswa/dashboard");

  redirect("/login");
}
