# 🍍 Pineapple Loot Xpress

A full-featured WoW Classic loot management web app built for the **Pineapple Express** guild on Galakrond — designed for **Mists of Pandaria Classic** and compatible with all Classic expansions.

---

## Overview

Pineapple Loot Xpress replaces spreadsheets and manual Discord tracking with a centralised loot management system covering the full raid lifecycle:

- Weekly raid setup via Raid-Helper + Softres.it integration
- Soft reserve tracking with automatic stacking (weeks consecutive)
- Loot win recording via Gargul CSV import
- Loot priority sheets per raid tier with class-aware suggestions
- Public-facing player profiles, soft reserve tables, and loot priority pages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 via Prisma 6 |
| Auth | Auth.js v5 (credentials, Discord OAuth via Raid-Helper) |
| Styling | Tailwind CSS v4 with CSS custom properties |
| Deployment | Docker Compose on self-hosted Ubuntu Server |
| Tunnel | Pangolin (self-hosted, replaces Cloudflare Tunnel) |
| Google Integration | Google Drive + Sheets API via OAuth 2.0 |

---

## Features

### Public Pages
- **Home** — guild overview, quick stats
- **Players** — all active raiders with class colours, spec, role, expandable loot win history per player
- **Loot Priority** — per-raid-tier tabs showing full priority chains with class abbreviations, colour-coded by class, stat indicators, and notes
- **Loot Table** — current week's soft reserves from Softres.it, grouped by player with roll ranges based on stacking weeks
- **Soft Reserves** — current week's reserves with stacking info

### Admin Panel
- **Dashboard** — quick action cards for all major workflows
- **Raid Weeks** — create and manage raid weeks; Night 1 + Night 2 support; Raid-Helper auto-setup from events
- **Raid Helper** — live event viewer showing signups grouped by role/class, with Raid-Helper API integration; sync to Softres.it
- **Raid Loot Priority** — full interactive spreadsheet per raid tier with:
  - Multi-raid tier groups (e.g. MoP T14 = MSV + HoF + ToES)
  - Collapsible drawer navigation
  - Per-item priority chain builder with class/spec suggestions
  - Tier token class mapping for all expansions (WotLK → MoP)
  - Import from Google Drive sheets or paste CSV
  - Fix Slots & Types backfill
  - Stat columns (STR/AGI/STA/CRT/HIT/MST/HST/EXP) with hover tooltips
  - Class abbreviation legend with WoW class colours
- **Record Win** — manually record a loot win for a player
- **Import** — Gargul Loot Distribution CSV import with deduplication via `gargulId`; manual stacking override
- **Players** — manage roster; sync classes/specs from Softres.it; expandable loot win drawers with per-row delete
- **Export** — Gargul-compatible JSON export, filterable by tier group or individual raid

### Integrations
- **Softres.it** — fetch raid reserves, auto-create players, auto-stack `weeksConsecutive` week-over-week
- **Raid-Helper** — fetch server events, auto-create raid weeks, sync signups to player roster; next 6 upcoming events only
- **Wowhead** — fetch item names, ilvls, stats, and item types on populate; version-aware links (MoP Classic, WotLK, Cata, etc.)
- **Gargul** — Loot Distribution CSV import (itemID-based, deduplication); JSON priority export
- **Google Drive / Sheets** — browse Drive, multi-tab import of priority sheets with auto column detection

---

## Loot Priority System

Priority chains use a structured format stored as JSON:

```
Prio > Class MS > Class MS = Class MS > All OS > Disenchant = Transmog
```

- `>` = lower priority tier
- `=` = tied priority (same tier)
- Chains are built via a visual priority builder with class/spec dropdowns
- Tier tokens automatically suggest eligible classes per expansion (Conqueror/Vanquisher/Protector)
- Class suggestions filter by armor type (Plate/Mail/Leather/Cloth) and primary stats

### Win Types
| Code | Meaning |
|---|---|
| PRIO | Loot priority winner |
| MS | Main spec roll |
| SR | Soft reserve |
| OS | Off spec roll |
| DE | Disenchanted |
| TMOG | Transmog / cosmetic roll |

---

## Raid Tier Groups

Multi-raid tiers are supported out of the box:

| Tier | Raids |
|---|---|
| MoP T14 | Mogu'shan Vaults + Heart of Fear + Terrace of Endless Spring |
| MoP T15 | Throne of Thunder |
| MoP T16 | Siege of Orgrimmar |
| Cata T11 | Blackwing Descent + Bastion of Twilight + Throne of the Four Winds |
| WotLK T7 | Naxxramas + Obsidian Sanctum + Eye of Eternity + Vault of Archavon |
| WotLK T10 | Icecrown Citadel + Ruby Sanctum |
| … | All expansions through Classic |

---

## Self-Hosted Setup

### Prerequisites
- Docker + Docker Compose
- A domain with DNS pointing to your server
- Pangolin or Cloudflare Tunnel (or direct port forwarding)

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Database
DATABASE_URL="postgresql://user:password@db:5432/pineapplelootxpress"
DB_PASSWORD="your_db_password"

# Auth
NEXTAUTH_SECRET="generate with: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"
AUTH_URL="https://your-domain.com"
AUTH_TRUST_HOST="true"

# Admin
ADMIN_PASSWORD="your_admin_password"

# Guild config
NEXT_PUBLIC_GUILD_NAME="Your Guild Name"
NEXT_PUBLIC_GUILD_REALM="Your Realm"

# Raid schedule
RAID_NIGHT_1_DAY="2"        # 0=Sun … 6=Sat
RAID_NIGHT_2_DAY="4"
RAID_START_TIME="23:59"
RAID_TIMEZONE="America/New_York"
RAID_INSTANCE="Siege of Orgrimmar"

# Raid-Helper (optional)
RAID_HELPER_API_KEY="your_key"
RAID_HELPER_SERVER_ID="your_discord_server_id"
RAID_HELPER_BASE_URL="https://raid-helper.xyz"

# Wowhead (use nether.wowhead.com for Classic)
WOWHEAD_HOST="nether.wowhead.com"

# Google OAuth (optional — for Drive/Sheets import)
GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret"
```

### Deploy

```bash
docker compose up -d
```

The app runs on port 3000 internally. Point your reverse proxy (NPM, Caddy, etc.) at it.

### Database Migrations

Migrations run automatically on startup via `docker-entrypoint.sh`. To run manually:

```bash
docker exec loot npx prisma migrate deploy
```

---

## Project Structure

```
src/
  app/
    (public)/          # Public-facing pages
    admin/             # Admin panel (password protected)
    api/               # API routes
  components/          # Shared React components
  lib/                 # Utilities (Prisma, auth, wow-constants, etc.)
prisma/
  schema.prisma        # DB schema
  migrations/          # SQL migrations
```

### Key Files

| File | Purpose |
|---|---|
| `src/lib/wow-constants.ts` | All WoW game data: class colours, specs, armor types, tier tokens, Wowhead URLs, slot→type mapping |
| `src/lib/softres.ts` | Softres.it API integration |
| `src/lib/google-oauth.ts` | Google OAuth token management |
| `src/lib/wowhead-parser.ts` | Parse Wowhead tooltip HTML for stats, ilvl, item type |
| `src/app/api/raids/route.ts` | Raid creation + Softres sync + auto stacking |
| `src/app/api/raid-loot/populate/route.ts` | Bulk populate loot items from zone data + Wowhead |
| `src/app/api/export/gargul/route.ts` | Gargul JSON priority export |
| `src/app/api/import/gargul/route.ts` | Gargul Loot Distribution CSV import |

---

## Design System

Dark WoW-inspired theme with gold accents:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0d0d10` | Page background |
| `--color-surface` | `#16171f` | Cards, panels |
| `--color-surface-2` | `#1e1f2a` | Table rows, inputs |
| `--color-gold` | `#c8a55a` | Primary accent |
| `--color-gold-light` | `#e8c97a` | Links, highlights |
| `--color-border` | `#2e2f3e` | Borders |

Global utility classes: `.btn-gold-solid`, `.btn-gold`, `.btn-ghost`, `.btn-danger`, `.btn-tab`, `.btn-add`, `.btn-secondary`, `.field`, `.data-table`, `.page-title`, `.section-label`

---

## Acknowledgements

Built for **Pineapple Express** — Galakrond, MoP Classic.  
In-game loot tracking via [Gargul](https://www.curseforge.com/wow/addons/gargul).  
Reserve system via [Softres.it](https://softres.it).  
Event scheduling via [Raid-Helper](https://raid-helper.dev).
