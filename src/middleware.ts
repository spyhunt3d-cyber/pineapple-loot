import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Try both cookie name variants — Auth.js uses __Secure- prefix on HTTPS,
  // plain name on HTTP. Behind NPM the request arrives as HTTP so we check both.
  // Cookie is explicitly set without __Secure- prefix (plain HTTP behind NPM proxy)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: "authjs.session-token" });

  if (!token) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/((?!login$).+)", "/admin"],
};
