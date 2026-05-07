import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";

const BASE_URL  = process.env.RAID_HELPER_BASE_URL  ?? "https://raid-helper.xyz";
const SERVER_ID = process.env.RAID_HELPER_SERVER_ID ?? "";
const API_KEY   = process.env.RAID_HELPER_API_KEY   ?? "";

const RH_HEADERS = {
  Authorization:  API_KEY,
  "Content-Type": "application/json",
};

async function proxyRH(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: RH_HEADERS,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const eventId = searchParams.get("eventId");

    if (eventId) {
      const { ok, status, data } = await proxyRH("GET", `/api/v4/events/${eventId}`);
      if (!ok) return NextResponse.json({ error: "Event not found" }, { status });
      return NextResponse.json(data);
    }

    const { ok, status, data } = await proxyRH("GET", `/api/v4/servers/${SERVER_ID}/events`);
    if (!ok) return NextResponse.json({ error: "Failed to fetch events" }, { status });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: (err as Error).message }, { status: 401 });
    console.error("[GET /api/raid-helper]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — edit event fields (title, description, startTime, etc.)
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const eventId = searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const body = await req.json();
    const { ok, status, data } = await proxyRH("PATCH", `/api/v4/events/${eventId}`, body);
    if (!ok) return NextResponse.json({ error: "Failed to update event", detail: data }, { status });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: (err as Error).message }, { status: 401 });
    console.error("[PATCH /api/raid-helper]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete event OR remove a signup
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const eventId  = searchParams.get("eventId");
    const signupId = searchParams.get("signupId");
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const path = signupId
      ? `/api/v4/events/${eventId}/signups/${signupId}`
      : `/api/v4/events/${eventId}`;

    const { ok, status, data } = await proxyRH("DELETE", path);
    if (!ok) return NextResponse.json({ error: "Delete failed", detail: data }, { status });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: (err as Error).message }, { status: 401 });
    console.error("[DELETE /api/raid-helper]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — add a signup to an event
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const eventId = searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const body = await req.json();
    const { ok, status, data } = await proxyRH("POST", `/api/v4/events/${eventId}/signups`, body);
    if (!ok) return NextResponse.json({ error: "Failed to add signup", detail: data }, { status });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: (err as Error).message }, { status: 401 });
    console.error("[POST /api/raid-helper]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
