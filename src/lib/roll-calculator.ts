/**
 * Weighted roll ranges for the Pineapple Express soft reserve system.
 *
 * Each consecutive week a player reserves the same item, their roll range
 * increases. The range caps at week 6 — beyond that the player keeps the
 * week-6 range (200–300) forever until they win or drop the reserve.
 *
 * Week 1: 1–100
 * Week 2: 20–120
 * Week 3: 50–150
 * Week 4: 90–190
 * Week 5: 140–240
 * Week 6: 200–300  ← hard cap
 */

export interface RollRange {
  min: number;
  max: number;
  /** Human-friendly label, e.g. "20–120" */
  label: string;
  /** 1–6, for styling (higher = warmer color) */
  week: number;
}

const RANGES: RollRange[] = [
  { min: 1,   max: 100, label: "1–100",   week: 1 },
  { min: 20,  max: 120, label: "20–120",  week: 2 },
  { min: 50,  max: 150, label: "50–150",  week: 3 },
  { min: 90,  max: 190, label: "90–190",  week: 4 },
  { min: 140, max: 240, label: "140–240", week: 5 },
  { min: 200, max: 300, label: "200–300", week: 6 },
];

/**
 * Returns the roll range for a given number of consecutive weeks reserved.
 * Caps at week 6 regardless of higher values.
 */
export function getRollRange(weeksConsecutive: number): RollRange {
  const index = Math.min(Math.max(weeksConsecutive, 1), 6) - 1;
  return RANGES[index];
}

/**
 * Returns the Tailwind color class for a roll range badge based on week tier.
 * Green (week 1) → Yellow → Orange → Gold (week 6)
 */
export function getRollRangeColorClass(week: number): string {
  switch (week) {
    case 1: return "bg-emerald-900/50 text-emerald-300 border-emerald-700";
    case 2: return "bg-green-900/50 text-green-300 border-green-700";
    case 3: return "bg-yellow-900/50 text-yellow-300 border-yellow-700";
    case 4: return "bg-orange-900/50 text-orange-300 border-orange-700";
    case 5: return "bg-red-900/50 text-red-300 border-red-700";
    case 6: return "bg-amber-900/50 text-amber-300 border-amber-600 font-bold";
    default: return "bg-zinc-800 text-zinc-400 border-zinc-600";
  }
}
