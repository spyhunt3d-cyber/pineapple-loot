import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google-oauth";

const BASE_URL = process.env.AUTH_URL ?? "https://loot.pineapple-xpress.org";

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${BASE_URL}/admin/raid-loot-priority?google=denied`);
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(`${BASE_URL}/admin/raid-loot-priority?google=connected`);
  } catch {
    return NextResponse.redirect(`${BASE_URL}/admin/raid-loot-priority?google=error`);
  }
}
