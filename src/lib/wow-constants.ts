/**
 * World of Warcraft game constants used across the app.
 * Class colors are the official Blizzard UI hex values.
 */

// Official WoW class colors (hex)
export const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "#C41E3A",
  Demon_Hunter:   "#A330C9",
  "Demon Hunter": "#A330C9",
  Druid:          "#FF7C0A",
  Evoker:         "#33937F",
  Hunter:         "#AAD372",
  Mage:           "#3FC7EB",
  Monk:           "#00FF98",
  Paladin:        "#F48CBA",
  Priest:         "#FFFFFF",
  Rogue:          "#FFF468",
  Shaman:         "#0070DD",
  Warlock:        "#8788EE",
  Warrior:        "#C69B3A",
};

// WoW class → available specs
export const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight": ["Blood", "Frost", "Unholy"],
  "Demon Hunter": ["Havoc", "Vengeance"],
  Druid:          ["Balance", "Feral", "Guardian", "Restoration"],
  Evoker:         ["Devastation", "Preservation", "Augmentation"],
  Hunter:         ["Beast Mastery", "Marksmanship", "Survival"],
  Mage:           ["Arcane", "Fire", "Frost"],
  Monk:           ["Brewmaster", "Mistweaver", "Windwalker"],
  Paladin:        ["Holy", "Protection", "Retribution"],
  Priest:         ["Discipline", "Holy", "Shadow"],
  Rogue:          ["Assassination", "Combat", "Subtlety", "Outlaw"],
  Shaman:         ["Elemental", "Enhancement", "Restoration"],
  Warlock:        ["Affliction", "Demonology", "Destruction"],
  Warrior:        ["Arms", "Fury", "Protection"],
};

// Softres.it numeric spec IDs → human-readable spec names
// These cover common Wrath/Cata-era spec IDs returned by softres.it API
export const SPEC_ID_MAP: Record<number, { class: string; spec: string }> = {
  // Druid
  1:  { class: "Druid",    spec: "Balance" },
  2:  { class: "Druid",    spec: "Feral" },
  3:  { class: "Druid",    spec: "Restoration" },
  // Hunter
  4:  { class: "Hunter",   spec: "Beast Mastery" },
  5:  { class: "Hunter",   spec: "Marksmanship" },
  6:  { class: "Hunter",   spec: "Survival" },
  // Mage
  7:  { class: "Mage",     spec: "Arcane" },
  8:  { class: "Mage",     spec: "Fire" },
  9:  { class: "Mage",     spec: "Frost" },
  // Druid (Boomkin/Guardian alternate IDs softres uses)
  10: { class: "Druid",    spec: "Balance" },
  11: { class: "Druid",    spec: "Feral" },
  12: { class: "Druid",    spec: "Restoration" },
  // Paladin
  13: { class: "Paladin",  spec: "Holy" },
  14: { class: "Paladin",  spec: "Protection" },
  15: { class: "Paladin",  spec: "Retribution" },
  // Priest
  16: { class: "Priest",   spec: "Discipline" },
  17: { class: "Priest",   spec: "Holy" },
  18: { class: "Priest",   spec: "Shadow" },
  // Rogue
  19: { class: "Rogue",    spec: "Assassination" },
  20: { class: "Rogue",    spec: "Combat" },
  21: { class: "Rogue",    spec: "Subtlety" },
  // Shaman
  22: { class: "Shaman",   spec: "Elemental" },
  23: { class: "Shaman",   spec: "Enhancement" },
  24: { class: "Shaman",   spec: "Restoration" },
  // Warlock
  25: { class: "Warlock",  spec: "Affliction" },
  26: { class: "Warlock",  spec: "Demonology" },
  27: { class: "Warlock",  spec: "Destruction" },
  // Warrior
  28: { class: "Warrior",  spec: "Arms" },
  29: { class: "Warrior",  spec: "Fury" },
  30: { class: "Warrior",  spec: "Protection" },
  // Death Knight
  31: { class: "Death Knight", spec: "Blood" },
  32: { class: "Death Knight", spec: "Frost" },
  33: { class: "Death Knight", spec: "Unholy" },
  // Alternate common IDs from softres data
  70: { class: "Shaman",   spec: "Elemental" },
  71: { class: "Shaman",   spec: "Enhancement" },
  72: { class: "Shaman",   spec: "Restoration" },
  80: { class: "Mage",     spec: "Arcane" },
  81: { class: "Mage",     spec: "Fire" },
  82: { class: "Mage",     spec: "Frost" },
  90: { class: "Warrior",  spec: "Arms" },
  91: { class: "Warrior",  spec: "Fury" },
  92: { class: "Warrior",  spec: "Protection" },
};

// Role display helpers
export const ROLE_ICONS: Record<string, string> = {
  tank:   "🛡️",
  healer: "💚",
  dps:    "⚔️",
};

// All WoW class names in display order
export const ALL_CLASSES = Object.keys(CLASS_COLORS);

// Priority tier display metadata
export const PRIORITY_TIERS: Record<number, { label: string; color: string; description: string }> = {
  1: { label: "Tier 1", color: "#FFD700", description: "Best in slot / highest priority" },
  2: { label: "Tier 2", color: "#C0C0C0", description: "Strong upgrade" },
  3: { label: "Tier 3", color: "#CD7F32", description: "Situational / minor upgrade" },
};
