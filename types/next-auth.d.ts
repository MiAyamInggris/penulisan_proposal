import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      identifier: string;
      isKetua: boolean;
      isKaprodi: boolean;
    };
  }
}
