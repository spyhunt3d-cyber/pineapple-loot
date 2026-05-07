/**
 * Protects all /admin/* routes.
 * Unauthenticated requests are redirected to /admin/login.
 * Uses NextAuth v5's auth() middleware integration.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  const isAuthenticated = !!req.auth;

  // Allow access to the login page always
  if (isLoginPage) return NextResponse.next();

  // Redirect unauthenticated users away from /admin/*
  if (isAdminRoute && !isAuthenticated) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run middleware on admin routes but NOT on API routes or static files
  matcher: ["/admin/:path*"],
};
