import { handlers } from "@/lib/auth";

// NextAuth v5 App Router handler — handles GET and POST for all auth routes:
// /api/auth/signin, /api/auth/signout, /api/auth/session, /api/auth/callback/...
export const { GET, POST } = handlers;
