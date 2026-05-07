import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

// Comprehensive spec/class name → canonical WoW class name
const CLASS_LOOKUP: Record<string, string> = {
  // Warrior
  "warrior": "Warrior", "war": "Warrior", "arms": "Warrior", "fury": "Warrior",
  "prot warrior": "Warrior", "prot war": "Warrior", "arms warrior": "Warrior", "fury warrior": "Warrior",
  // Paladin
  "paladin": "Paladin", "pal": "Paladin", "pally": "Paladin", "pala": "Paladin",
  "ret": "Paladin", "retribution": "Paladin", "ret paladin": "Paladin", "ret pal": "Paladin",
  "holy paladin": "Paladin", "holy pal": "Paladin", "holy pally": "Paladin",
  "prot paladin": "Paladin", "prot pal": "Paladin", "prot pally": "Paladin",
  // Hunter
  "hunter": "Hunter", "hun": "Hunter",
  "mm": "Hunter", "marksmanship": "Hunter", "marks": "Hunter",
  "bm": "Hunter", "beast mastery": "Hunter",
  "sv": "Hunter", "survival": "Hunter", "surv": "Hunter",
  "mm hunter": "Hunter", "sv hunter": "Hunter", "bm hunter": "Hunter",
  // Rogue
  "rogue": "Rogue", "rog": "Rogue",
  "combat": "Rogue", "assassination": "Rogue", "subtlety": "Rogue", "sub": "Rogue",
  "rogue (c)": "Rogue", "rogue (s)": "Rogue",
  // Priest
  "priest": "Priest", "pri": "Priest",
  "shadow": "Priest", "spriest": "Priest", "shadow priest": "Priest",
  "disc": "Priest", "discipline": "Priest", "disc priest": "Priest",
  "holy priest": "Priest",
  // Death Knight
  "death knight": "Death Knight", "dk": "Death Knight", "deathknight": "Death Knight",
  "blood": "Death Knight", "blood dk": "Death Knight", "dk (blood)": "Death Knight",
  "frost dk": "Death Knight", "frost death knight": "Death Knight", "deathknight (fr)": "Death Knight",
  "unholy": "Death Knight", "unholy dk": "Death Knight", "deathknight (u)": "Death Knight",
  // Shaman
  "shaman": "Shaman", "shm": "Shaman", "sham": "Shaman",
  "enhance": "Shaman", "enhancement": "Shaman", "enh": "Shaman", "enh shaman": "Shaman", "enh sham": "Shaman",
  "ele": "Shaman", "elemental": "Shaman", "ele shaman": "Shaman", "ele sham": "Shaman",
  "resto shaman": "Shaman", "rsham": "Shaman", "resto sham": "Shaman", "rshaman": "Shaman",
  // Mage
  "mage": "Mage", "mag": "Mage",
  "fire": "Mage", "frost mage": "Mage", "arcane": "Mage",
  // Warlock
  "warlock": "Warlock", "wrl": "Warlock", "lock": "Warlock", "wlock": "Warlock",
  "affliction": "Warlock", "destruction": "Warlock", "demonology": "Warlock",
  // Monk
  "monk": "Monk", "mon": "Monk",
  "windwalker": "Monk", "ww": "Monk", "windwalker monk": "Monk",
  "mistweaver": "Monk", "mw": "Monk", "mistweaver monk": "Monk",
  "brewmaster": "Monk", "brew": "Monk", "brewmaster monk": "Monk",
  // Druid
  "druid": "Druid", "dru": "Druid",
  "feral": "Druid", "feral druid": "Druid",
  "balance": "Druid", "boomkin": "Druid", "boom": "Druid", "balance druid": "Druid",
  "guardian": "Druid", "guardian druid": "Druid",
  "resto druid": "Druid", "rdruid": "Druid", "rdu": "Druid",
  // Wildcards
  "all": "*", "rest": "*", "others": "*", "everyone": "*", "os": "*",
};

type PrioEntry = { class: string; spec: "MS" | "OS" | "*" };
type PrioChain = PrioEntry[][];

function resolveClass(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return CLASS_LOOKUP[key] ?? null;
}

/** Parse "Rogue > Enhance = Hunter > Rest" into a PrioChain */
function parsePriorityString(str: string): PrioChain {
  if (!str.trim()) return [];
  // Unescape \> from Google Sheets markdown
  const cleaned = str.replace(/\\>/g, ">").replace(/\\/g, "").trim();
  const tiers = cleaned.split(">").map(t => t.trim()).filter(Boolean);

  const chain: PrioChain = tiers.map(tier => {
    const entries = tier.split("=").map(e => e.trim()).filter(Boolean);
    return entries.flatMap(entry => {
      // Strip trailing /something shortcuts like "Monk/Enhance" → treat as separate
      const parts = entry.split("/").map(p => p.trim());
      return parts.flatMap((part): PrioEntry[] => {
        const resolved = resolveClass(part);
        if (!resolved) return [];
        if (resolved === "*") return [{ class: "*", spec: "OS" }];
        return [{ class: resolved, spec: "MS" }];
      });
    });
  }).filter(t => t.length > 0);

  // Auto-append * OS tier if last tier isn't already wildcard
  const lastTier = chain[chain.length - 1];
  if (lastTier && !lastTier.some(e => e.class === "*")) {
    chain.push([{ class: "*", spec: "OS" }]);
  }

  return chain;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { instance, instances, rows } = await req.json() as {
      instance?: string;
      instances?: string[];
      rows: { itemName: string; priority: string; boss?: string; notes?: string }[];
    };

    const instanceList = instances?.length ? instances : instance ? [instance] : [];
    if (!instanceList.length || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "instance(s) and rows are required" }, { status: 400 });
    }

    const dbItems = await prisma.raidLoot.findMany({
      where: { instance: { in: instanceList } },
      select: { id: true, itemName: true },
    });
    const nameMap = new Map(dbItems.map(i => [i.itemName.toLowerCase(), i.id]));

    let updated = 0, unmatched = 0;

    for (const row of rows) {
      const chain = parsePriorityString(row.priority);
      const key = row.itemName.toLowerCase().trim();

      let id = nameMap.get(key);
      if (!id) {
        for (const [dbName, dbId] of nameMap) {
          if (dbName.includes(key) || key.includes(dbName)) { id = dbId; break; }
        }
      }
      if (!id) { unmatched++; continue; }

      const data: Record<string, unknown> = { priorityChain: chain as never };
      if (row.notes?.trim()) data.notes = row.notes.trim();
      if (row.boss?.trim())  data.bossName = row.boss.trim();

      await prisma.raidLoot.update({ where: { id }, data });
      updated++;
    }

    return NextResponse.json({ updated, unmatched, total: rows.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[POST /api/raid-loot/import-prio]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
