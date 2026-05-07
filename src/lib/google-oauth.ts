import { prisma } from "./prisma";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI  = `${process.env.AUTH_URL}/api/auth/google/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
].join(" ");

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string): Promise<void> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Token exchange failed");
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };
  await saveTokens(data.access_token, data.refresh_token, data.expires_in);
}

async function saveTokens(accessToken: string, refreshToken: string | undefined, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  await prisma.appSetting.upsert({
    where: { key: "google_access_token" },
    create: { key: "google_access_token", value: accessToken },
    update: { value: accessToken },
  });
  await prisma.appSetting.upsert({
    where: { key: "google_token_expires_at" },
    create: { key: "google_token_expires_at", value: String(expiresAt) },
    update: { value: String(expiresAt) },
  });
  if (refreshToken) {
    await prisma.appSetting.upsert({
      where: { key: "google_refresh_token" },
      create: { key: "google_refresh_token", value: refreshToken },
      update: { value: refreshToken },
    });
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const data = await res.json() as { access_token: string; expires_in: number };
  await saveTokens(data.access_token, undefined, data.expires_in);
  return data.access_token;
}

export async function getAccessToken(): Promise<string | null> {
  const [tokenRow, expiresRow, refreshRow] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "google_access_token" } }),
    prisma.appSetting.findUnique({ where: { key: "google_token_expires_at" } }),
    prisma.appSetting.findUnique({ where: { key: "google_refresh_token" } }),
  ]);
  if (!tokenRow) return null;

  const expiresAt = expiresRow ? Number(expiresRow.value) : 0;
  // Refresh if within 2 minutes of expiry
  if (Date.now() > expiresAt - 120_000 && refreshRow) {
    return refreshAccessToken(refreshRow.value);
  }
  return tokenRow.value;
}

export async function isConnected(): Promise<boolean> {
  const token = await prisma.appSetting.findUnique({ where: { key: "google_access_token" } });
  return !!token;
}

export async function disconnect(): Promise<void> {
  await prisma.appSetting.deleteMany({
    where: { key: { in: ["google_access_token", "google_refresh_token", "google_token_expires_at"] } },
  });
}
