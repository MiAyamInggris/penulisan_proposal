import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role: string = req.auth.user?.role ?? "";

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (
    (pathname.startsWith("/dosen") ||
      pathname.startsWith("/dosen-kelas") ||
      pathname.startsWith("/pembimbing") ||
      pathname.startsWith("/print") ||
      pathname.startsWith("/ketua-kk")) &&
    role !== "DOSEN"
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/mahasiswa") && role !== "MAHASISWA") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // /ketua-kk requires the isKetua flag in addition to DOSEN role
  if (pathname.startsWith("/ketua-kk") && !req.auth?.user?.isKetua) {
    return NextResponse.redirect(new URL("/dosen-kelas/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
