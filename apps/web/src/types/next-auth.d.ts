import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    idToken?: string;
    accessToken?: string;
    lastAccessAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    lastAccessAt?: string;
  }
}
