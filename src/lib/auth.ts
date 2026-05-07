import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqual } from "crypto";
import { isRateLimited } from "./rate-limit";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { isAdmin: boolean };
  }
}

/** Constant-time string comparison — prevents timing side-channel attacks. */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Always compare a fixed-length buffer to avoid length oracle
  const ref = Buffer.alloc(Math.max(bufA.length, bufB.length));
  bufA.copy(ref);
  const cmp = Buffer.alloc(ref.length);
  bufB.copy(cmp);
  return timingSafeEqual(ref, cmp) && bufA.length === bufB.length;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,

  // Explicitly use plain cookie names (no __Secure-/__Host- prefixes).
  // The app runs HTTP internally behind NPM's SSL termination — Auth.js sees HTTP
  // and can't match __Secure- cookies it set when AUTH_URL pointed to https://.
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: false },
    },
    callbackUrl: {
      name: "authjs.callback-url",
      options: { sameSite: "lax" as const, path: "/", secure: false },
    },
    csrfToken: {
      name: "authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: false },
    },
  },

  providers: [
    Credentials({
      name: "Admin Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) throw new Error("ADMIN_PASSWORD is not set");

        // Rate limit by a fixed key (single admin — no per-IP in server context here)
        if (isRateLimited("login:admin")) {
          throw new Error("Too many login attempts. Try again in 15 minutes.");
        }

        const submitted = (credentials?.password as string) ?? "";
        if (!safeCompare(submitted, adminPassword)) return null;

        return { id: "admin", name: "Admin", email: "admin@local", isAdmin: true };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60,
  },

  pages: {
    signIn: "/admin/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.isAdmin = (user as { isAdmin?: boolean }).isAdmin === true;
      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
});

export async function requireAdmin(): Promise<true> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new AuthError("Unauthorized");
  return true;
}

export class AuthError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}
