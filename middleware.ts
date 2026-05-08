import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const roles: string[] = req.auth.user?.roles ?? [];

  if (pathname.startsWith("/admin") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/dosen-kelas") && !roles.includes("DOSEN_KELAS")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/pembimbing") && !roles.includes("PEMBIMBING")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/mahasiswa") && !roles.includes("MAHASISWA")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
