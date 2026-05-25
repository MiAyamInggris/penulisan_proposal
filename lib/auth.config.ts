import type { NextAuthConfig } from "next-auth";

// Lightweight config used in proxy.ts (no Prisma, no bcrypt).
// Full config (with Credentials provider) lives in lib/auth.ts.
export const authConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.identifier = (user as { identifier: string }).identifier;
        token.isKetua = (user as { isKetua?: boolean }).isKetua ?? false;
        token.isKaprodi = (user as { isKaprodi?: boolean }).isKaprodi ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.identifier = token.identifier as string;
        session.user.id = token.sub!;
        session.user.isKetua = (token.isKetua as boolean) ?? false;
        session.user.isKaprodi = (token.isKaprodi as boolean) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
