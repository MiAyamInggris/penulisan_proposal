import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Lightweight auth — no Prisma, no bcrypt, only JWT session reading.
// Full auth config (Credentials provider) lives in lib/auth.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname === "/login") return NextResponse.next();

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role: string = (req.auth.user as { role?: string })?.role ?? "";

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (
    (pathname.startsWith("/dosen") ||
      pathname.startsWith("/dosen-kelas") ||
      pathname.startsWith("/pembimbing") ||
      pathname.startsWith("/print")) &&
    role !== "DOSEN"
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/mahasiswa") && role !== "MAHASISWA") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
