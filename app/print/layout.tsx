import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN") redirect("/login");

  return (
    <div style={{ background: "white", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
