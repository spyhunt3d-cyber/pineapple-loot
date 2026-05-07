import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getAccessToken, isConnected, disconnect } from "@/lib/google-oauth";

// GET /api/drive?q=search — list Google Sheets matching a query
// GET /api/drive?status=1 — check connection status
// DELETE /api/drive — disconnect Google account
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    if (req.nextUrl.searchParams.has("status")) {
      return NextResponse.json({ connected: await isConnected() });
    }

    const q = req.nextUrl.searchParams.get("q") ?? "";
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not connected to Google" }, { status: 401 });

    const query = [
      "mimeType='application/vnd.google-apps.spreadsheet'",
      q ? `(name contains '${q.replace(/'/g, "\\'")}' or fullText contains '${q.replace(/'/g, "\\'")}')` : "",
    ].filter(Boolean).join(" and ");

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,owners)&orderBy=modifiedTime desc&pageSize=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json({ error: "Drive API error" }, { status: 500 });
    const data = await res.json() as { files: { id: string; name: string; modifiedTime: string }[] };
    return NextResponse.json({ files: data.files ?? [] });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    await disconnect();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
