/**
 * NextAuth v5 (Auth.js) configuration.
 *
 * Uses a simple Credentials provider — admins log in with a single
 * ADMIN_PASSWORD env var. No user table needed.
 *
 * Session strategy: JWT (no DB session storage required).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Admin Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
          throw new Error("ADMIN_PASSWORD environment variable is not set");
        }

        if (credentials?.password === adminPassword) {
          // Return a minimal user object — we only have one admin
          return { id: "admin", name: "Admin", email: "admin@pineapple-loot.local" };
        }

        // Return null = invalid credentials (NextAuth handles the error)
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Sessions last 8 hours — a full raid night + some buffer
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
});
