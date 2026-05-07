/**
 * Lightweight runtime validation helpers — no external dependency.
 * Used at every API boundary in place of plain TypeScript casts.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Parse and validate an integer path param. Returns 400-safe integer or throws. */
export function parseIdParam(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Invalid ID: "${raw}"`);
  }
  return n;
}

const WIN_TYPES = new Set(["MS", "SR", "PRIO", "OS"]);

/** Validates a WinType string at runtime. */
export function validateWinType(value: unknown): string {
  if (typeof value !== "string" || !WIN_TYPES.has(value)) {
    throw new ValidationError(`Invalid winType: "${value}". Must be MS, SR, PRIO, or OS.`);
  }
  return value;
}

/** Clamp a string to max length. Throws if not a string. */
export function requireString(value: unknown, field: string, maxLen = 256): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  if (value.length > maxLen) {
    throw new ValidationError(`${field} exceeds max length of ${maxLen}`);
  }
  return value.trim();
}

/** Optional string — undefined if missing/empty, validated if present. */
export function optionalString(value: unknown, field: string, maxLen = 256): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  if (value.length > maxLen) throw new ValidationError(`${field} exceeds max length of ${maxLen}`);
  return value.trim();
}

/** Parse body as JSON, returning a 400 response on any failure. */
export async function parseBody<T>(req: Request, maxBytes = 512_000): Promise<T | null> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) return null;
  try {
    return await (req as Request & { json(): Promise<T> }).json();
  } catch {
    return null;
  }
}
