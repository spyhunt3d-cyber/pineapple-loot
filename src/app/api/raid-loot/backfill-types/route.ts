import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { slotToType, getTierTokenClasses } from "@/lib/wow-constants";

const STALE_WEAPON_TYPES = new Set([
  "Sword","Axe","Mace","Dagger","Staff","Polearm","Fist Weapon","Wand",
  "Bow","Gun","Crossbow","Held In Off-hand","Fishing Pole",
]);

function normalizeType(itemType: string | null, itemName: string, itemSlot: string | null, instance: string): string | null {
  // Token detection by name takes priority
  if (getTierTokenClasses(itemName, instance)) return "Token";
  // Stale raw Wowhead values
  if (itemType === "Back") return "Cloak";
  if (itemType && STALE_WEAPON_TYPES.has(itemType)) return "Weapon";
  // Null — derive from slot
  if (!itemType) return slotToType(itemSlot);
  return null; // already correct
}

export async function POST() {
  try {
    await requireAdmin();

    const items = await prisma.raidLoot.findMany({
      select: { id: true, itemName: true, itemSlot: true, itemType: true, instance: true },
    });

    let updated = 0;
    for (const item of items) {
      const fixed = normalizeType(item.itemType, item.itemName, item.itemSlot, item.instance);
      if (fixed && fixed !== item.itemType) {
        await prisma.raidLoot.update({ where: { id: item.id }, data: { itemType: fixed } });
        updated++;
      }
    }

    return NextResponse.json({ updated, total: items.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[POST /api/raid-loot/backfill-types]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
