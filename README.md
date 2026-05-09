# SoftRes Loot System

A full-featured WoW Classic loot management web app — originally built for a guild on Galakrond running **Mists of Pandaria Classic**, compatible with all Classic expansions.

> **Built for any guild.** Fork or copy freely — swap out the name, emoji, and colours via environment variables and it's yours. See [Branding](#branding) below.

---

## Overview

SoftRes Loot System replaces spreadsheets and manual Discord tracking with a centralised loot management system covering the full raid lifecycle:

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
  - Tier token class mapping for all expansions (Vanilla Classic T1/T2/T3 → TBC → WotLK → Cata → MoP)
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
- Tier tokens automatically suggest eligible classes per expansion — shared tokens (Conqueror/Vanquisher/Protector) for TBC+, and named set detection for Vanilla T1/T2/T3 (e.g. Lawbringer → Paladin, Dragonstalker → Hunter, Plagueheart → Warlock)
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
| Classic T1 | Molten Core |
| Classic T2 | Blackwing Lair |
| Classic T2.5 | Temple of Ahn'Qiraj |
| Classic T3 | Naxxramas (40) |
| TBC T4 | Karazhan + Gruul's Lair + Magtheridon's Lair |
| TBC T5 | Serpentshrine Cavern + The Eye |
| TBC T6 | Battle for Mount Hyjal + Black Temple + Sunwell Plateau |
| WotLK T7 | Naxxramas + Obsidian Sanctum + Eye of Eternity + Vault of Archavon |
| WotLK T8 | Ulduar |
| WotLK T9 | Trial of the Crusader |
| WotLK T10 | Icecrown Citadel + Ruby Sanctum |
| Cata T11 | Blackwing Descent + Bastion of Twilight + Throne of the Four Winds |
| Cata T12 | Firelands |
| Cata T13 | Dragon Soul |
| MoP T14 | Mogu'shan Vaults + Heart of Fear + Terrace of Endless Spring |
| MoP T15 | Throne of Thunder |
| MoP T16 | Siege of Orgrimmar |

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
RAID_START_TIME="20:00"
RAID_TIMEZONE="America/New_York"
RAID_INSTANCE=""            # leave blank — admins select the instance per raid week

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

## Google Drive / Sheets Integration

The admin import panel can browse your Google Drive and pull loot priority sheets directly from Google Sheets. This requires a Google OAuth 2.0 credential tied to your app's domain.

### 1. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project → New Project**, give it a name (e.g. `Loot Xpress`), and create it
3. Make sure the new project is selected in the top bar

### 2. Enable the Required APIs

1. Go to **APIs & Services → Library**
2. Search for and enable **Google Drive API**
3. Search for and enable **Google Sheets API**

### 3. Configure the OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace org), click **Create**
3. Fill in:
   - **App name** — anything (e.g. `Loot Xpress`)
   - **User support email** — your email
   - **Developer contact email** — your email
4. Click **Save and Continue** through Scopes (you'll add scopes via the credential, not here)
5. Under **Test users**, add the Google account(s) that will connect to the app
6. Click **Save and Continue**, then **Back to Dashboard**

> While the app is in **Testing** mode only added test users can connect — this is fine for a private guild tool. You do not need to publish or verify the app.

### 4. Create an OAuth 2.0 Credential

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Set **Application type** to **Web application**
4. Give it a name (e.g. `Loot Xpress Web`)
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.com/api/auth/google/callback
   ```
   Replace `your-domain.com` with your actual domain (must match `AUTH_URL` in your `.env`)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** from the popup

### 5. Add to Your `.env`

```env
GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret"
```

Then restart the app:

```bash
docker compose up -d --force-recreate app
```

### 6. Connect the Account in the Admin Panel

1. Log in to the admin panel and go to **Import**
2. Click **Connect Google Account** — you'll be redirected to Google's consent screen
3. Sign in with the Google account that has access to your sheets
4. Grant the requested permissions (Drive read-only + Sheets read-only)
5. You'll be redirected back — the panel will now show a **Browse Drive** button

The access token is stored in the database and refreshes automatically. You only need to connect once.

### 7. Importing a Priority Sheet

1. In **Admin → Import**, click **Browse Drive** and find your Google Sheet
2. Select the sheet — tabs are listed automatically
3. Pick the tab(s) to import; columns are detected automatically (item name, item ID, priority chain, notes, etc.)
4. Map any unrecognised columns if prompted, then click **Import**

### Disconnecting

To revoke access, click **Disconnect Google** in the Import panel. This removes the stored tokens from the database. You can reconnect at any time.

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

## Branding

All visible branding is driven by environment variables — no code changes required.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Pineapple Loot Xpress` | App name shown in the navbar, admin panel, page title, and login screen |
| `NEXT_PUBLIC_APP_EMOJI` | `🍍` | Emoji shown next to the app name |
| `NEXT_PUBLIC_APP_DESCRIPTION` | *(generic description)* | Browser tab / SEO description |
| `NEXT_PUBLIC_GUILD_NAME` | `Pineapple Express` | Guild name used in loot exports |
| `NEXT_PUBLIC_GUILD_REALM` | `Galakrond` | Realm name shown on public pages |

To brand it for your guild, set these in your `.env`:

```env
NEXT_PUBLIC_APP_NAME="Crimson Tide Loot"
NEXT_PUBLIC_APP_EMOJI="🔴"
NEXT_PUBLIC_APP_DESCRIPTION="Crimson Tide guild loot tracker — WoW Classic"
NEXT_PUBLIC_GUILD_NAME="Crimson Tide"
NEXT_PUBLIC_GUILD_REALM="Benediction"
```

For custom icons, replace `/public/icon.svg` with your own SVG — it's used as the browser favicon.

---

## Acknowledgements

Originally built for a guild on Galakrond — MoP Classic.  
In-game loot tracking via [Gargul](https://www.curseforge.com/wow/addons/gargul).  
Reserve system via [Softres.it](https://softres.it).  
Event scheduling via [Raid-Helper](https://raid-helper.dev).
