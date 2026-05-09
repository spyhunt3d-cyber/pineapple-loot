/**
 * World of Warcraft game constants used across the app.
 * Class colors are the official Blizzard UI hex values.
 */

// Official WoW class colors (hex)
export const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "#C41E3A",
  Druid:          "#FF7C0A",
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

// WoW class → available specs (MoP Classic)
export const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight": ["Blood", "Frost", "Unholy"],
  Druid:          ["Balance", "Feral", "Guardian", "Restoration"],
  Hunter:         ["Beast Mastery", "Marksmanship", "Survival"],
  Mage:           ["Arcane", "Fire", "Frost"],
  Monk:           ["Brewmaster", "Mistweaver", "Windwalker"],
  Paladin:        ["Holy", "Protection", "Retribution"],
  Priest:         ["Discipline", "Holy", "Shadow"],
  Rogue:          ["Assassination", "Combat", "Subtlety"],
  Shaman:         ["Elemental", "Enhancement", "Restoration"],
  Warlock:        ["Affliction", "Demonology", "Destruction"],
  Warrior:        ["Arms", "Fury", "Protection"],
};

// Spec → role mapping (used for auto-populating role from spec)
export const SPEC_ROLE: Record<string, "Tank" | "Healer" | "DPS"> = {
  // Tanks
  Blood:        "Tank",
  Guardian:     "Tank",
  Brewmaster:   "Tank",
  Protection:   "Tank",   // Paladin & Warrior
  // Healers
  Discipline:   "Healer",
  Holy:         "Healer", // Paladin & Priest
  Restoration:  "Healer", // Druid & Shaman
  Mistweaver:   "Healer",
  // DPS — everything else
  Frost:        "DPS",    // Mage & DK
  Unholy:       "DPS",
  Balance:      "DPS",
  Feral:        "DPS",
  Windwalker:   "DPS",
  Retribution:  "DPS",
  Shadow:       "DPS",
  "Beast Mastery": "DPS",
  Marksmanship: "DPS",
  Survival:     "DPS",
  Arcane:       "DPS",
  Fire:         "DPS",
  Assassination:"DPS",
  Combat:       "DPS",
  Subtlety:     "DPS",
  Elemental:    "DPS",
  Enhancement:  "DPS",
  Affliction:   "DPS",
  Demonology:   "DPS",
  Destruction:  "DPS",
  Arms:         "DPS",
  Fury:         "DPS",
};

// Softres.it numeric spec IDs for MoP Classic
// Pattern: class_index * 10 + spec_index (verified from live API data)
export const SPEC_ID_MAP: Record<number, { class: string; spec: string }> = {
  // Druid (1x)
  10: { class: "Druid",        spec: "Balance" },
  11: { class: "Druid",        spec: "Feral" },
  12: { class: "Druid",        spec: "Guardian" },
  13: { class: "Druid",        spec: "Restoration" },
  // Hunter (2x)
  20: { class: "Hunter",       spec: "Beast Mastery" },
  21: { class: "Hunter",       spec: "Marksmanship" },
  22: { class: "Hunter",       spec: "Survival" },
  // Mage (3x)
  30: { class: "Mage",         spec: "Arcane" },
  31: { class: "Mage",         spec: "Fire" },
  32: { class: "Mage",         spec: "Frost" },
  // Priest (4x)
  40: { class: "Priest",       spec: "Discipline" },
  41: { class: "Priest",       spec: "Holy" },
  42: { class: "Priest",       spec: "Shadow" },
  // Paladin (5x)
  50: { class: "Paladin",      spec: "Holy" },
  51: { class: "Paladin",      spec: "Protection" },
  52: { class: "Paladin",      spec: "Retribution" },
  // Rogue (6x)
  60: { class: "Rogue",        spec: "Assassination" },
  61: { class: "Rogue",        spec: "Combat" },
  62: { class: "Rogue",        spec: "Subtlety" },
  // Shaman (7x)
  70: { class: "Shaman",       spec: "Elemental" },
  71: { class: "Shaman",       spec: "Enhancement" },
  72: { class: "Shaman",       spec: "Restoration" },
  // Warlock (8x)
  80: { class: "Warlock",      spec: "Affliction" },
  81: { class: "Warlock",      spec: "Demonology" },
  82: { class: "Warlock",      spec: "Destruction" },
  // Warrior (9x)
  90: { class: "Warrior",      spec: "Arms" },
  91: { class: "Warrior",      spec: "Fury" },
  92: { class: "Warrior",      spec: "Protection" },
  // Death Knight (10x)
  100: { class: "Death Knight", spec: "Blood" },
  101: { class: "Death Knight", spec: "Frost" },
  102: { class: "Death Knight", spec: "Unholy" },
  // Monk (11x)
  110: { class: "Monk",        spec: "Brewmaster" },
  111: { class: "Monk",        spec: "Mistweaver" },
  112: { class: "Monk",        spec: "Windwalker" },
};

// Role display helpers
export const ROLE_ICONS: Record<string, string> = {
  tank:    "🛡️",
  healer:  "💚",
  dps:     "⚔️",
  Tank:    "🛡️",
  Healer:  "💚",
  DPS:     "⚔️",
};

// All WoW class names in display order
export const ALL_CLASSES = Object.keys(CLASS_COLORS);

// Softres.it instance slug → human-readable raid name
export const SOFTRES_INSTANCE_MAP: Record<string, string> = {
  // Classic / Vanilla
  mc:      "Molten Core",
  ony:     "Onyxia's Lair",
  bwl:     "Blackwing Lair",
  aq20:    "Ruins of Ahn'Qiraj",
  aq40:    "Temple of Ahn'Qiraj",
  naxx40:  "Naxxramas (40)",
  zg:      "Zul'Gurub",
  // TBC
  kara:    "Karazhan",
  gruul:   "Gruul's Lair",
  mag:     "Magtheridon's Lair",
  ssc:     "Serpentshrine Cavern",
  tk:      "The Eye",
  hyjal:   "Battle for Mount Hyjal",
  bt:      "Black Temple",
  sw:      "Sunwell Plateau",
  za:      "Zul'Aman",
  // Wrath
  naxx10:  "Naxxramas (10)",
  naxx25:  "Naxxramas (25)",
  naxx:    "Naxxramas",
  os10:    "Obsidian Sanctum (10)",
  os25:    "Obsidian Sanctum (25)",
  os:      "Obsidian Sanctum",
  eoe10:   "Eye of Eternity (10)",
  eoe25:   "Eye of Eternity (25)",
  eoe:     "Eye of Eternity",
  voa10:   "Vault of Archavon (10)",
  voa25:   "Vault of Archavon (25)",
  ulduar10:"Ulduar (10)",
  ulduar25:"Ulduar (25)",
  ulduar:  "Ulduar",
  toc10:   "Trial of the Crusader (10)",
  toc25:   "Trial of the Crusader (25)",
  toc:     "Trial of the Crusader",
  icc10:   "Icecrown Citadel (10)",
  icc25:   "Icecrown Citadel (25)",
  icc:     "Icecrown Citadel",
  rs10:    "Ruby Sanctum (10)",
  rs25:    "Ruby Sanctum (25)",
  rs:      "Ruby Sanctum",
  // Cataclysm
  bwd:     "Blackwing Descent",
  bot:     "Bastion of Twilight",
  tot4w:   "Throne of the Four Winds",
  fl:      "Firelands",
  ds10:    "Dragon Soul (10)",
  ds25:    "Dragon Soul (25)",
  ds:      "Dragon Soul",
  // MoP
  msv:     "Mogu'shan Vaults",
  hof:     "Heart of Fear",
  toes:    "Terrace of Endless Spring",
  tot:     "Throne of Thunder",
  soo10:   "Siege of Orgrimmar (10)",
  soo25:   "Siege of Orgrimmar (25)",
  soo:     "Siege of Orgrimmar",
  // WoD
  hm:      "Highmaul",
  bf:      "Blackrock Foundry",
  hfc:     "Hellfire Citadel",
  // Legion
  en:      "Emerald Nightmare",
  tov:     "Trial of Valor",
  nh:      "The Nighthold",
  tos:     "Tomb of Sargeras",
  antorus: "Antorus, the Burning Throne",
  // BfA
  uldir:   "Uldir",
  bod:     "Battle of Dazar'alor",
  cos:     "Crucible of Storms",
  ep:      "The Eternal Palace",
  nyalotha:"Ny'alotha",
  // Shadowlands
  cn:      "Castle Nathria",
  sod:     "Sanctum of Domination",
  sfo:     "Sepulcher of the First Ones",
  // Dragonflight
  voti:    "Vault of the Incarnates",
  aberrus: "Aberrus, the Shadowed Crucible",
  amirdrassil: "Amirdrassil, the Dream's Hope",
  // TWW
  nerubgar: "Nerub-ar Palace",
};

/** Resolve a Softres instance slug to a display name, falling back to the slug itself. */
export function resolveInstanceName(slug: string): string {
  return SOFTRES_INSTANCE_MAP[slug.toLowerCase()] ?? slug;
}

/** Grouped list of raids for the instance dropdown. */
// Multi-instance tier groups — for loading/importing across related raids in one phase
export const RAID_TIER_GROUPS: { label: string; instances: string[] }[] = [
  // MoP
  { label: "MoP T14 — Phase 1 (MSV + HoF + ToES)", instances: ["Mogu'shan Vaults", "Heart of Fear", "Terrace of Endless Spring"] },
  { label: "MoP T15 — Phase 2 (Throne of Thunder)",  instances: ["Throne of Thunder"] },
  { label: "MoP T16 — Phase 3 (Siege of Orgrimmar)", instances: ["Siege of Orgrimmar"] },
  // Cata
  { label: "Cata T11 — Tier 11 (BWD + BoT + TotFW)", instances: ["Blackwing Descent", "Bastion of Twilight", "Throne of the Four Winds"] },
  { label: "Cata T12 — Tier 12 (Firelands)",          instances: ["Firelands"] },
  { label: "Cata T13 — Tier 13 (Dragon Soul)",        instances: ["Dragon Soul"] },
  // WotLK
  { label: "WotLK T7 — Tier 7 (Naxx + OS + EoE)",    instances: ["Naxxramas", "Obsidian Sanctum", "Eye of Eternity", "Vault of Archavon"] },
  { label: "WotLK T8 — Tier 8 (Ulduar)",              instances: ["Ulduar"] },
  { label: "WotLK T9 — Tier 9 (ToC)",                 instances: ["Trial of the Crusader"] },
  { label: "WotLK T10 — Tier 10 (ICC + RS)",          instances: ["Icecrown Citadel", "Ruby Sanctum"] },
  // TBC
  { label: "TBC T4 (Kara + Gruul + Mag)",             instances: ["Karazhan", "Gruul's Lair", "Magtheridon's Lair"] },
  { label: "TBC T5 (SSC + TK)",                       instances: ["Serpentshrine Cavern", "The Eye"] },
  { label: "TBC T6 (Hyjal + BT + Sunwell)",           instances: ["Battle for Mount Hyjal", "Black Temple", "Sunwell Plateau"] },
  // Vanilla / Classic
  { label: "Classic T1 — Tier 1 (Molten Core)",       instances: ["Molten Core"] },
  { label: "Classic T2 — Tier 2 (Blackwing Lair)",    instances: ["Blackwing Lair"] },
  { label: "Classic T2.5 — AQ40",                     instances: ["Temple of Ahn'Qiraj"] },
  { label: "Classic T3 — Tier 3 (Naxxramas 40)",      instances: ["Naxxramas (40)"] },
];

export const RAID_INSTANCE_GROUPS: { label: string; raids: string[] }[] = [
  { label: "The War Within", raids: ["Nerub-ar Palace"] },
  { label: "Dragonflight",   raids: ["Vault of the Incarnates", "Aberrus, the Shadowed Crucible", "Amirdrassil, the Dream's Hope"] },
  { label: "Shadowlands",    raids: ["Castle Nathria", "Sanctum of Domination", "Sepulcher of the First Ones"] },
  { label: "Battle for Azeroth", raids: ["Uldir", "Battle of Dazar'alor", "Crucible of Storms", "The Eternal Palace", "Ny'alotha"] },
  { label: "Legion",         raids: ["Emerald Nightmare", "Trial of Valor", "The Nighthold", "Tomb of Sargeras", "Antorus, the Burning Throne"] },
  { label: "Warlords of Draenor", raids: ["Highmaul", "Blackrock Foundry", "Hellfire Citadel"] },
  { label: "Mists of Pandaria", raids: ["Mogu'shan Vaults", "Heart of Fear", "Terrace of Endless Spring", "Throne of Thunder", "Siege of Orgrimmar"] },
  { label: "Cataclysm",     raids: ["Blackwing Descent", "Bastion of Twilight", "Throne of the Four Winds", "Firelands", "Dragon Soul"] },
  { label: "Wrath of the Lich King", raids: ["Naxxramas", "Obsidian Sanctum", "Eye of Eternity", "Vault of Archavon", "Ulduar", "Trial of the Crusader", "Icecrown Citadel", "Ruby Sanctum"] },
  { label: "The Burning Crusade", raids: ["Karazhan", "Gruul's Lair", "Magtheridon's Lair", "Serpentshrine Cavern", "The Eye", "Battle for Mount Hyjal", "Black Temple", "Zul'Aman", "Sunwell Plateau"] },
  { label: "Classic",       raids: ["Molten Core", "Onyxia's Lair", "Blackwing Lair", "Zul'Gurub", "Ruins of Ahn'Qiraj", "Temple of Ahn'Qiraj", "Naxxramas (40)"] },
];

// Wowhead game version path segment per raid instance
// Used to build correct item links for each expansion's classic server
export const INSTANCE_WOWHEAD_VERSION: Record<string, string> = {
  // MoP Classic
  "Mogu'shan Vaults": "mop-classic", "Heart of Fear": "mop-classic",
  "Terrace of Endless Spring": "mop-classic", "Throne of Thunder": "mop-classic",
  "Siege of Orgrimmar": "mop-classic",
  // Cataclysm Classic
  "Blackwing Descent": "cata", "Bastion of Twilight": "cata",
  "Throne of the Four Winds": "cata", "Firelands": "cata", "Dragon Soul": "cata",
  // Wrath Classic
  "Naxxramas": "wotlk", "Obsidian Sanctum": "wotlk", "Eye of Eternity": "wotlk",
  "Vault of Archavon": "wotlk", "Ulduar": "wotlk", "Trial of the Crusader": "wotlk",
  "Icecrown Citadel": "wotlk", "Ruby Sanctum": "wotlk",
  // TBC Classic
  "Karazhan": "tbc", "Gruul's Lair": "tbc", "Magtheridon's Lair": "tbc",
  "Serpentshrine Cavern": "tbc", "The Eye": "tbc", "Battle for Mount Hyjal": "tbc",
  "Black Temple": "tbc", "Zul'Aman": "tbc", "Sunwell Plateau": "tbc",
  // Classic Era / SoD
  "Molten Core": "classic", "Onyxia's Lair": "classic", "Blackwing Lair": "classic",
  "Zul'Gurub": "classic", "Ruins of Ahn'Qiraj": "classic",
  "Temple of Ahn'Qiraj": "classic", "Naxxramas (40)": "classic",
  // Retail (no path prefix needed — use empty string)
  "Nerub-ar Palace": "",
  "Vault of the Incarnates": "", "Aberrus, the Shadowed Crucible": "", "Amirdrassil, the Dream's Hope": "",
  "Castle Nathria": "", "Sanctum of Domination": "", "Sepulcher of the First Ones": "",
};

export function getWowheadItemUrl(itemId: string | number, instance?: string | null): string {
  const version = instance ? (INSTANCE_WOWHEAD_VERSION[instance] ?? "") : "";
  const path = version ? `/${version}/item=${itemId}` : `/item=${itemId}`;
  return `https://www.wowhead.com${path}`;
}

/** Returns the data-wowhead attribute value including domain for correct tooltip version */
export function getWowheadDataAttr(itemId: string | number, instance?: string | null): string {
  const version = instance ? (INSTANCE_WOWHEAD_VERSION[instance] ?? "") : "";
  return version ? `item=${itemId}&domain=${version}` : `item=${itemId}`;
}

// Item slot → item type mapping (used to auto-populate type from slot)
export const SLOT_TO_TYPE: Record<string, string> = {
  "finger":           "Ring",
  "trinket":          "Trinket",
  "neck":             "Neck",
  "back":             "Cloak",
  "shield":           "Shield",
  "main hand":        "Weapon",
  "off hand":         "Weapon",
  "one-hand":         "Weapon",
  "two-hand":         "Weapon",
  "ranged":           "Weapon",
  "held in off-hand": "Weapon",
  "thrown":           "Weapon",
  "relic":            "Weapon",
  "mount":            "Mount",
  "pet":              "Pet",
};

export function slotToType(slot: string | null | undefined): string | null {
  if (!slot) return null;
  return SLOT_TO_TYPE[slot.toLowerCase()] ?? null;
}

// 3-char class abbreviations for compact priority chain display
export const CLASS_ABBR: Record<string, string> = {
  "Warrior":      "WAR",
  "Paladin":      "PAL",
  "Hunter":       "HUN",
  "Rogue":        "ROG",
  "Priest":       "PRI",
  "Death Knight": "DK",
  "Shaman":       "SHM",
  "Mage":         "MAG",
  "Warlock":      "WRL",
  "Monk":         "MON",
  "Druid":        "DRU",
};

// Armor type each class wears at max level (MoP Classic)
export const CLASS_ARMOR_TYPE: Record<string, string> = {
  "Warrior":      "Plate",
  "Paladin":      "Plate",
  "Death Knight": "Plate",
  "Hunter":       "Mail",
  "Shaman":       "Mail",
  "Rogue":        "Leather",
  "Druid":        "Leather",
  "Monk":         "Leather",
  "Mage":         "Cloth",
  "Warlock":      "Cloth",
  "Priest":       "Cloth",
};

// Armor types that restrict which classes can wear them
const ARMOR_TYPES_SET = new Set(["Plate", "Mail", "Leather", "Cloth"]);

/** Returns true if a class can use an item of the given type */
export function classCanUseItemType(className: string, itemType: string | null | undefined): boolean {
  if (!itemType || !ARMOR_TYPES_SET.has(itemType)) return true; // non-armor: no restriction
  const armorType = CLASS_ARMOR_TYPE[className];
  if (!armorType) return true; // unknown class: allow
  return armorType === itemType;
}

// Which primary stats each class benefits from (for loot priority suggestions)
export const CLASS_PRIMARY_STATS: Record<string, string[]> = {
  "Warrior":      ["str"],
  "Death Knight": ["str"],
  "Paladin":      ["str", "int"],
  "Rogue":        ["agi"],
  "Hunter":       ["agi"],
  "Monk":         ["agi", "int"],
  "Shaman":       ["agi", "int"],
  "Druid":        ["str", "agi", "int"],
  "Mage":         ["int"],
  "Warlock":      ["int"],
  "Priest":       ["int"],
};

type TokenMap = Record<"conqueror" | "vanquisher" | "protector", string[]>;

// Tier token class eligibility per raid tier.
// Classic / Vanilla tokens use "Might" / "Transcendence" / "Prophecy" / etc. — handled by name keywords below.
const TOKEN_MAPS: { instances: string[]; map: TokenMap }[] = [
  // MoP T14 (MSV / HoF / ToES)
  {
    instances: ["Mogu'shan Vaults", "Heart of Fear", "Terrace of Endless Spring"],
    map: {
      conqueror:  ["Warrior", "Paladin", "Death Knight"],
      vanquisher: ["Mage", "Priest", "Rogue", "Warlock"],
      protector:  ["Druid", "Hunter", "Monk", "Shaman"],
    },
  },
  // MoP T15 (Throne of Thunder) & T16 (Siege of Orgrimmar)
  {
    instances: ["Throne of Thunder", "Siege of Orgrimmar"],
    map: {
      conqueror:  ["Warrior", "Paladin", "Death Knight"],
      vanquisher: ["Druid", "Hunter", "Monk", "Rogue"],
      protector:  ["Mage", "Priest", "Shaman", "Warlock"],
    },
  },
  // Cata T11 (BWD/BoT/TotFW), T12 (Firelands), T13 (Dragon Soul)
  {
    instances: ["Blackwing Descent", "Bastion of Twilight", "Throne of the Four Winds", "Firelands", "Dragon Soul"],
    map: {
      conqueror:  ["Druid", "Mage", "Rogue"],
      vanquisher: ["Death Knight", "Paladin", "Shaman", "Warrior"],
      protector:  ["Hunter", "Priest", "Warlock"],
    },
  },
  // WotLK T7-T10 (all use same token set, no Monk/DK in Wrath)
  {
    instances: ["Naxxramas", "Obsidian Sanctum", "Eye of Eternity", "Vault of Archavon",
                "Ulduar", "Trial of the Crusader", "Icecrown Citadel", "Ruby Sanctum"],
    map: {
      conqueror:  ["Paladin", "Priest", "Warlock"],
      vanquisher: ["Death Knight", "Mage", "Rogue"],
      protector:  ["Druid", "Hunter", "Shaman", "Warrior"],
    },
  },
  // TBC T4-T6
  {
    instances: ["Karazhan", "Gruul's Lair", "Magtheridon's Lair",
                "Serpentshrine Cavern", "The Eye", "Battle for Mount Hyjal",
                "Black Temple", "Zul'Aman", "Sunwell Plateau"],
    map: {
      conqueror:  ["Paladin", "Priest", "Warlock"],
      vanquisher: ["Druid", "Mage", "Rogue"],
      protector:  ["Hunter", "Shaman", "Warrior"],
    },
  },
];

// Vanilla T1/T2/T3 tier sets — class-specific named pieces, no shared tokens.
// Each entry maps a set name keyword to the single class that wears it.
// Order matters for "wrath" — check specific phrases before short keywords.
const VANILLA_TIER_SETS: { keyword: string; class: string }[] = [
  // T1 — Molten Core (Tier 1)
  { keyword: "lawbringer",          class: "Paladin"  }, // Lawbringer Armor
  { keyword: "giantstalker",        class: "Hunter"   }, // Giantstalker Armor
  { keyword: "ten storms",          class: "Shaman"   }, // The Ten Storms
  { keyword: "nightslayer",         class: "Rogue"    }, // Nightslayer Armor
  { keyword: "cenarion",            class: "Druid"    }, // Cenarion Raiment
  { keyword: "arcanist",            class: "Mage"     }, // Arcanist Regalia
  { keyword: "felheart",            class: "Warlock"  }, // Felheart Raiment
  { keyword: "vestments of prophecy", class: "Priest" }, // Vestments of Prophecy
  { keyword: "mantle of prophecy",    class: "Priest" },
  { keyword: "crown of prophecy",     class: "Priest" },
  { keyword: "boots of prophecy",     class: "Priest" },
  { keyword: "pants of prophecy",     class: "Priest" },
  { keyword: "gloves of prophecy",    class: "Priest" },
  { keyword: "girdle of prophecy",    class: "Priest" },
  { keyword: "shoulders of prophecy", class: "Priest" },
  { keyword: "circlet of prophecy",   class: "Priest" },
  { keyword: "bracers of might",      class: "Warrior" }, // T1 Warrior — check phrases before "might"
  { keyword: "helm of might",         class: "Warrior" },
  { keyword: "pauldrons of might",    class: "Warrior" },
  { keyword: "breastplate of might",  class: "Warrior" },
  { keyword: "gauntlets of might",    class: "Warrior" },
  { keyword: "belt of might",         class: "Warrior" },
  { keyword: "legplates of might",    class: "Warrior" },
  { keyword: "sabatons of might",     class: "Warrior" },
  // T2 — Blackwing Lair (Tier 2)
  { keyword: "judgement",           class: "Paladin"  }, // Judgement Armor
  { keyword: "dragonstalker",       class: "Hunter"   }, // Dragonstalker Armor
  { keyword: "earthfury",           class: "Shaman"   }, // The Earthfury
  { keyword: "bloodfang",           class: "Rogue"    }, // Bloodfang Armor
  { keyword: "stormrage",           class: "Druid"    }, // Stormrage Raiment
  { keyword: "netherwind",          class: "Mage"     }, // Netherwind Regalia
  { keyword: "nemesis",             class: "Warlock"  }, // Nemesis Raiment
  { keyword: "transcendence",       class: "Priest"   }, // Vestments of Transcendence
  { keyword: "helm of wrath",       class: "Warrior"  }, // T2 Warrior — check phrases before "wrath"
  { keyword: "pauldrons of wrath",  class: "Warrior"  },
  { keyword: "breastplate of wrath",class: "Warrior"  },
  { keyword: "bracers of wrath",    class: "Warrior"  },
  { keyword: "gauntlets of wrath",  class: "Warrior"  },
  { keyword: "belt of wrath",       class: "Warrior"  },
  { keyword: "legplates of wrath",  class: "Warrior"  },
  { keyword: "sabatons of wrath",   class: "Warrior"  },
  // T3 — Naxxramas 40 (Tier 3)
  { keyword: "dreadnaught",         class: "Warrior"  }, // Dreadnaught's Battlegear
  { keyword: "redemption",          class: "Paladin"  }, // Redemption Armor
  { keyword: "cryptstalker",        class: "Hunter"   }, // Cryptstalker Armor
  { keyword: "earthshatterer",      class: "Shaman"   }, // The Earthshatterer
  { keyword: "bonescythe",          class: "Rogue"    }, // Bonescythe Armor
  { keyword: "dreamwalker",         class: "Druid"    }, // Dreamwalker Raiment
  { keyword: "frostfire",           class: "Mage"     }, // Frostfire Regalia
  { keyword: "plagueheart",         class: "Warlock"  }, // Plagueheart Raiment
  { keyword: "vestments of faith",  class: "Priest"   }, // Vestments of Faith
  { keyword: "halo of transcendence", class: "Priest" }, // already covered but alias
  { keyword: "shroud of transcendence", class: "Priest" },
];

/** Returns eligible classes for a tier token item, or null if not a token. */
export function getTierTokenClasses(itemName: string, instance?: string | null): string[] | null {
  const lower = itemName.toLowerCase();

  // TBC+ shared tokens (conqueror / vanquisher / protector)
  const hasSharedToken = lower.includes("conqueror") || lower.includes("vanquisher") || lower.includes("protector");
  if (hasSharedToken) {
    const entry = instance ? TOKEN_MAPS.find(e => e.instances.includes(instance)) : null;
    const map = entry?.map ?? TOKEN_MAPS[1].map; // fallback to T15/T16 (most common)
    if (lower.includes("conqueror")) return map.conqueror;
    if (lower.includes("vanquisher")) return map.vanquisher;
    if (lower.includes("protector")) return map.protector;
  }

  // Vanilla T1/T2/T3 — class-specific named pieces
  for (const { keyword, class: cls } of VANILLA_TIER_SETS) {
    if (lower.includes(keyword)) return [cls];
  }

  return null;
}

// Priority tier display metadata
export const PRIORITY_TIERS: Record<number, { label: string; color: string; description: string }> = {
  1: { label: "Tier 1", color: "#FFD700", description: "Best in slot / highest priority" },
  2: { label: "Tier 2", color: "#C0C0C0", description: "Strong upgrade" },
  3: { label: "Tier 3", color: "#CD7F32", description: "Situational / minor upgrade" },
};
