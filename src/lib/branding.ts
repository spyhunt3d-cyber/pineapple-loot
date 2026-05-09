export const BRANDING = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Pineapple Loot Xpress",
  emoji:   process.env.NEXT_PUBLIC_APP_EMOJI ?? "🍍",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Guild loot management — Soft reserves, loot priority, and win tracking.",
  userAgent: process.env.NEXT_PUBLIC_APP_NAME
    ? `${process.env.NEXT_PUBLIC_APP_NAME.replace(/\s+/g, "")}/1.0`
    : "LootXpress/1.0",
} as const;
