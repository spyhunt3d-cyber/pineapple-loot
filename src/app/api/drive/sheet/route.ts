import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getAccessToken } from "@/lib/google-oauth";

async function fetchTab(token: string, fileId: string, tab: string): Promise<string[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(tab)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const d = await res.json() as { values?: string[][] };
  return d.values ?? [];
}

// GET /api/drive/sheet?id=FILE_ID
//   → returns { tabs: string[], preview: string[][] } (first tab preview, 6 rows)
// GET /api/drive/sheet?id=FILE_ID&tabs=Tab1,Tab2
//   → returns { sheets: { tab: string, rows: string[][] }[] }
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not connected to Google" }, { status: 401 });

    const fileId  = req.nextUrl.searchParams.get("id");
    const tabsParam = req.nextUrl.searchParams.get("tabs");
    if (!fileId) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Fetch sheet metadata (tab list)
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) return NextResponse.json({ error: "Sheets API error" }, { status: 500 });
    const meta = await metaRes.json() as { sheets: { properties: { title: string } }[] };
    const tabs = meta.sheets?.map(s => s.properties.title) ?? [];

    if (!tabsParam) {
      // Return tab list + preview of first tab
      const preview = tabs[0] ? await fetchTab(token, fileId, tabs[0]) : [];
      return NextResponse.json({ tabs, preview: preview.slice(0, 8) });
    }

    // Return full data for requested tabs
    const requested = tabsParam.split(",").map(t => t.trim()).filter(t => tabs.includes(t));
    const sheets = await Promise.all(
      requested.map(async tab => ({ tab, rows: await fetchTab(token, fileId, tab) }))
    );
    return NextResponse.json({ sheets });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
