# crypto-tools

Personal Vite + React app for DeFi farming tracking, project research,
daily task check-ins, and automated funding-round scraping. Uses Supabase
for storage and Vercel serverless Python functions for scraper endpoints.

Five tabs:
- **Daily** — Notion-style table of daily tasks with one checkbox column per
  wallet. Resets at 1am local time. No cron, no scheduled jobs — the "reset"
  is a query change.
- **Tracking** — projects you're actively farming. Tag system, multi-wallet
  notes, farming stages (waitlist, testnet, mainnet, claimed…), last-interaction
  date, details popup that pulls fundraising data from Research.
- **Research** — every project you find interesting. XLSX import from
  cryptorank-tracker exports, idempotent by CryptoRank slug. "Track" checkbox
  spawns synced Working + Tracking entries.
- **Working** — projects you've committed to farming, with full editable metadata.
- **Scraper** — CryptoRank + ICO Analytics scanner. Fetches funding rounds,
  upserts into `scraper_projects` table, and can send finds to the Research
  pipeline.

UI: matt dark + dark green, JetBrains Mono, tactical/terminal aesthetic.

---

## Setup

### Requirements
- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project (free tier fine)

### 1. Install
```bash
npm install
```

### 2. Create the database
Supabase dashboard → **SQL Editor** → **New query** → run **in this order**:

1. `supabase-schema.sql` — base tables (tags, research, working, tracking)
2. `supabase-migration-v2.sql` — cryptorank_key column, stages table
3. `supabase-migration-v3.sql` — daily tasks tables
4. `supabase-migration-v4.sql` — scraper_projects table

All four files are safe to re-run if you're unsure.

### 3. Configure env vars
Supabase → **Settings ▸ API**. Copy:
- **Project URL** (the `https://xxx.supabase.co` one, NOT a `postgresql://` pooler)
- **anon public key**

Create `.env.local` at the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

The `VITE_` prefixed vars are for the React frontend. The non-prefixed ones
are used by the Python API functions (scraper). On Vercel, set all four as
Environment Variables.

RLS is disabled in the schema — this is a single-user personal app. The anon
key effectively grants full read/write. Don't commit `.env.local`, don't
share the values.

### 4. Run
```bash
npm run dev
```
Or double-click `start.bat` (Windows) — starts the dev server silently, no
browser popup. Vite prints the URL in the terminal (default:
`http://localhost:5173`).

---

## Deploy to Vercel

1. Push to GitHub.
2. Vercel → **Add New ▸ Project** → import the repo.
3. **Settings ▸ Environment Variables**: add all four env vars (tick all three
   environments — Production, Preview, Development).
4. **Deploy**.

Subsequent deploys: `git push`.

---

## Notes on how key features work

### Daily reset at 1am
No cron. A check row is `(task_id, wallet_id, check_date)`. "Today's state"
is `WHERE check_date = $today`. Tomorrow's date is a different filter → all
checkboxes render unchecked. The 1am cutoff is done client-side by subtracting
1 hour from `now` before taking the local date. Yesterday's checks stay in
the DB as a free history trail.

### Adding research → tracking
Ticking "Track" on a Research row creates linked entries in Working AND
Tracking, and sets `research.in_working = true` so the checkbox stays sticky.
Unticking reverses it. The `research_id` foreign key lets the Details modal
in Tracking display fundraising data from the linked Research row.

### XLSX import (Research tab)
Drop a cryptorank-tracker export. Dedup is by CryptoRank slug (extracted
from the URL), falling back to case-insensitive name match. Re-importing
overlapping date ranges is idempotent — "Skip existing" is the safe default.
"Update existing" overwrites with the XLSX values if you want to refresh
scraped data.

### Scraper → Research bridge
The Scraper tab's "Send to Research" button copies a project from
`scraper_projects` into the `research` table, mapping fields (funding_stage →
actual_stage, etc.) and deduplicating on `cryptorank_key`.

### Tags vs Stages
- **Tags** (Tracking tab): multi-select. Global list. Coloured pills.
- **Stages** (Tracking tab): single-select. Global list. Your farming
  progress (waitlist / testnet / mainnet / claimed…).
- **`actual_stage`** on Research/Working: funding round (Pre Seed / Series A…).
  Separate concept, comes from the scraper or manual entry.

---

## File map

```
crypto-tools/
├── package.json
├── vite.config.js
├── vercel.json
├── start.bat                        Windows launcher (silent, no browser)
├── supabase-schema.sql              Run first
├── supabase-migration-v2.sql        Run second
├── supabase-migration-v3.sql        Run third
├── supabase-migration-v4.sql        Run fourth (scraper table)
├── .env.local                       You create this
├── api/
│   ├── requirements.txt             Python deps (httpx, beautifulsoup4)
│   ├── scan.py                      CryptoRank scan endpoint
│   ├── scan_ico.py                  ICO Analytics scan endpoint
│   └── _lib/
│       ├── cryptorank.py            CryptoRank API scraper
│       ├── icoanalytics.py          ICO Analytics HTML scraper
│       └── database.py              Supabase REST client for Python
└── src/
    ├── App.jsx                      Tab nav + toast system
    ├── main.jsx
    ├── index.css                    Theme tokens
    ├── lib/
    │   ├── supabase.js
    │   ├── utils.js                 Date helpers, cn, nanoid, hex luminance
    │   └── xlsx-parse.js            Cryptorank XLSX → research payload
    ├── hooks/
    │   ├── useStore.js              Tracker Supabase queries and mutations
    │   └── useScraperStore.js       Scraper state + send-to-research
    └── components/
        ├── tabs/
        │   ├── DailyTab.jsx
        │   ├── TrackingTab.jsx
        │   ├── ResearchTab.jsx
        │   ├── WorkingTab.jsx
        │   └── ScraperTab.jsx
        ├── modals/
        │   ├── EditDailyTaskModal.jsx
        │   ├── DailyWalletManagerModal.jsx
        │   ├── EditTrackingModal.jsx
        │   ├── DetailsModal.jsx
        │   ├── EditProjectModal.jsx
        │   ├── ImportXlsxModal.jsx
        │   ├── TagManagerModal.jsx
        │   └── StageManagerModal.jsx
        └── ui/
            ├── Modal.jsx            Portal-based, centred, 90vh cap
            ├── Button.jsx
            ├── Field.jsx
            ├── Tag.jsx
            └── DropdownMenu.jsx     Portal-based, escapes row overflow
```
