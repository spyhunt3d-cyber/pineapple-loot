/**
 * Guild raid schedule helpers.
 * Config comes from NEXT_PUBLIC_RAID_* env vars so it's available client-side.
 */

export interface RaidSchedule {
  night1Day:  number; // 0=Sun … 6=Sat
  night2Day:  number;
  startTime:  string; // "HH:MM" local time
  timezone:   string; // IANA tz, e.g. "America/New_York"
  instance:   string;
}

export function getRaidSchedule(): RaidSchedule {
  return {
    night1Day: parseInt(process.env.NEXT_PUBLIC_RAID_NIGHT_1_DAY ?? "2", 10), // Tuesday
    night2Day: parseInt(process.env.NEXT_PUBLIC_RAID_NIGHT_2_DAY ?? "4", 10), // Thursday
    startTime: process.env.NEXT_PUBLIC_RAID_START_TIME ?? "23:59",
    timezone:  process.env.NEXT_PUBLIC_RAID_TIMEZONE  ?? "America/New_York",
    instance:  process.env.NEXT_PUBLIC_RAID_INSTANCE  ?? "Siege of Orgrimmar",
  };
}

/** Day-of-week name */
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export function dayName(day: number) { return DAY_NAMES[day] ?? ""; }

/**
 * Given a Monday date string (YYYY-MM-DD), return the YYYY-MM-DD date
 * for a given day-of-week offset in that same week.
 */
export function weekdayDate(mondayISO: string, targetDow: number): string {
  // Monday = 1, so offset = targetDow - 1 (since our weeks start Monday)
  const monday = new Date(mondayISO + "T00:00:00Z");
  const offset  = targetDow === 0 ? 6 : targetDow - 1; // Sun wraps to +6
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Get the Monday of the current week (in the raid timezone).
 * Returns a YYYY-MM-DD string.
 */
export function currentWeekMonday(timezone: string): string {
  const now   = new Date();
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now); // gives YYYY-MM-DD

  const d   = new Date(local + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the Mondays for the current week and next N weeks.
 */
export function upcomingMondays(timezone: string, count = 4): string[] {
  const base = currentWeekMonday(timezone);
  const d    = new Date(base + "T00:00:00Z");
  return Array.from({ length: count }, (_, i) => {
    const w = new Date(d);
    w.setUTCDate(w.getUTCDate() + i * 7);
    return w.toISOString().slice(0, 10);
  });
}

/** Format a YYYY-MM-DD as "Mon Jan 6" (UTC) */
export function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
