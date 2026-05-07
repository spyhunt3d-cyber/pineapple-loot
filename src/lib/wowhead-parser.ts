/** Parse Wowhead tooltip HTML to extract ilvl, stats, and item type. */

export interface ParsedTooltip {
  ilvl: number | null;
  stats: Record<string, boolean>;
  itemType: string | null;
}

// Armor types — returned as-is
const ARMOR_TYPES = ["Plate", "Mail", "Leather", "Cloth"];

// Weapon subtypes — all normalised to "Weapon"
const WEAPON_SUBTYPES = [
  "Staff", "Sword", "Axe", "Mace", "Dagger", "Polearm",
  "Fist Weapon", "Fishing Pole", "Wand",
  "Bow", "Gun", "Crossbow", "Thrown",
  "One-Hand", "Two-Hand", "Main Hand", "Off Hand",
  "Held In Off-hand",
];

// Misc slot types
const MISC_TYPES: [RegExp | string, string][] = [
  ["Trinket",  "Trinket"],
  ["Ring",     "Ring"],
  [/\bNeck\b/, "Neck"],
  ["Cloak",    "Cloak"],
  [/\bBack\b/, "Cloak"],
  ["Shield",   "Shield"],
];

export function parseWowheadTooltip(tooltip: string): ParsedTooltip {
  // Strip HTML tags for plain-text matching
  const plain = tooltip.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ");

  // ilvl — handle both commented and uncommented formats
  const ilvlMatch = tooltip.match(/Item Level (?:<!--ilvl-->)?(\d+)/) ??
                    plain.match(/Item Level\s+(\d+)/);
  const ilvl = ilvlMatch ? parseInt(ilvlMatch[1], 10) : null;

  // Stats — check presence in plain text
  const has = (pattern: RegExp | string) =>
    typeof pattern === "string" ? plain.includes(pattern) : pattern.test(plain);

  const stats: Record<string, boolean> = {
    str:     has("Strength"),
    agi:     has("Agility"),
    sta:     has("Stamina"),
    int:     has("Intellect"),
    spi:     has("Spirit"),
    crit:    has("Critical Strike"),
    hit:     has(/\bHit\b/),
    mastery: has("Mastery"),
    haste:   has("Haste"),
    exp:     has("Expertise"),
    dodge:   has("Dodge"),
    parry:   has("Parry"),
    sockets: has("Socket"),
  };

  // Remove false entries to keep it compact
  Object.keys(stats).forEach(k => { if (!stats[k]) delete stats[k]; });

  // Item type — armor first (most specific), then misc slots, then weapons
  let itemType: string | null = null;

  for (const t of ARMOR_TYPES) {
    if (plain.includes(t)) { itemType = t; break; }
  }

  if (!itemType) {
    for (const [pattern, label] of MISC_TYPES) {
      if (has(pattern)) { itemType = label; break; }
    }
  }

  if (!itemType) {
    for (const t of WEAPON_SUBTYPES) {
      if (plain.includes(t)) { itemType = "Weapon"; break; }
    }
  }

  return { ilvl, stats, itemType };
}
