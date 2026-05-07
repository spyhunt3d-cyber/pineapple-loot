/**
 * Gargul addon import/export utilities.
 *
 * IMPORT FORMAT (basic CSV from Gargul "Export Loot"):
 *   {charactername}-{server},{numberOfLootWon}
 *   feckful-galakrond,0
 *   innomine-galakrond,1
 *
 * Note: Character names in WoW cannot contain hyphens. Server names CAN
 * (e.g., "Burning-Blade"). We split on the FIRST hyphen to separate
 * charName from server, since charName is always a single word.
 *
 * EXPORT FORMAT (Gargul loot priority JSON):
 *   { "Guild Name": { "Item Name": { "CLASS": { "SPEC": tier } } } }
 */

export interface GargulImportRow {
  charName: string;
  server: string;
  lootCount: number;
  /** The raw line, kept for error reporting */
  raw: string;
}

export interface GargulParseResult {
  rows: GargulImportRow[];
  errors: { line: number; raw: string; reason: string }[];
}

/**
 * Parses a Gargul CSV export string into structured rows.
 * Skips blank lines and comment lines (starting with #).
 */
export function parseGargulCsv(csv: string): GargulParseResult {
  const rows: GargulImportRow[] = [];
  const errors: GargulParseResult["errors"] = [];

  const lines = csv.split("\n");

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Skip blank lines and comments
    if (!line || line.startsWith("#")) return;

    // Split on the last comma to get loot count
    const lastComma = line.lastIndexOf(",");
    if (lastComma === -1) {
      errors.push({ line: idx + 1, raw: line, reason: "Missing comma separator" });
      return;
    }

    const nameServerPart = line.slice(0, lastComma).trim();
    const countPart = line.slice(lastComma + 1).trim();
    const lootCount = parseInt(countPart, 10);

    if (isNaN(lootCount)) {
      errors.push({ line: idx + 1, raw: line, reason: `Invalid loot count: "${countPart}"` });
      return;
    }

    // Split name-server on the FIRST hyphen (charName is a single word, no hyphens)
    const firstHyphen = nameServerPart.indexOf("-");
    if (firstHyphen === -1) {
      errors.push({ line: idx + 1, raw: line, reason: "Missing hyphen between name and server" });
      return;
    }

    const charName = nameServerPart.slice(0, firstHyphen).trim().toLowerCase();
    const server = nameServerPart.slice(firstHyphen + 1).trim().toLowerCase();

    if (!charName) {
      errors.push({ line: idx + 1, raw: line, reason: "Empty character name" });
      return;
    }
    if (!server) {
      errors.push({ line: idx + 1, raw: line, reason: "Empty server name" });
      return;
    }

    rows.push({ charName, server, lootCount, raw: line });
  });

  return { rows, errors };
}

/**
 * Serializes loot priority data into Gargul's JSON import format.
 *
 * Gargul expects:
 * {
 *   "Guild Name": {
 *     "Item Name": {
 *       "DRUID": { "BALANCE": 1, "FERAL": 2 },
 *       "WARRIOR": { "*": 1 }
 *     }
 *   }
 * }
 *
 * Tier values: 1 = highest priority, 2 = medium, 3 = low
 * "*" as spec means "all specs of that class"
 */
export interface GargulPriorityEntry {
  itemName: string;
  class: string;
  spec: string;
  priorityTier: number;
}

export function serializeGargulPriority(
  guildName: string,
  entries: GargulPriorityEntry[]
): Record<string, unknown> {
  const output: Record<string, Record<string, Record<string, Record<string, number>>>> = {
    [guildName]: {},
  };

  const guild = output[guildName];

  for (const entry of entries) {
    const itemKey = entry.itemName;
    const classKey = entry.class.toUpperCase();
    // Gargul uses "*" for "all specs" — preserve as-is, else uppercase
    const specKey = entry.spec === "*" ? "*" : entry.spec.toUpperCase();

    if (!guild[itemKey]) guild[itemKey] = {};
    if (!guild[itemKey][classKey]) guild[itemKey][classKey] = {};

    guild[itemKey][classKey][specKey] = entry.priorityTier;
  }

  return output;
}
