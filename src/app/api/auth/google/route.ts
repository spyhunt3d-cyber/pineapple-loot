import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-oauth";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.redirect(getAuthUrl());
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to initiate Google auth" }, { status: 500 });
  }
}
