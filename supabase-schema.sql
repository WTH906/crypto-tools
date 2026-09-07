-- ============================================================
-- DeFi Tracker — Supabase schema
-- Run this in the Supabase SQL editor (Project ▸ SQL Editor ▸ New query).
-- ============================================================

-- ---------- Tags ----------
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text not null default '#4ade80',
  created_at  timestamptz not null default now()
);

-- ---------- Research (interesting projects) ----------
create table if not exists public.research (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text default '',
  last_fund_date      date,
  link                text default '',
  short_description   text default '',
  actual_stage        text default '',
  fundraising_amount  text default '',
  how_to_farm         text default '',
  additional_notes    text default '',
  in_working          boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ---------- Working (projects you're farming) ----------
create table if not exists public.working (
  id                  uuid primary key default gen_random_uuid(),
  research_id         uuid references public.research(id) on delete set null,
  name                text not null,
  category            text default '',
  last_fund_date      date,
  link                text default '',
  short_description   text default '',
  actual_stage        text default '',
  fundraising_amount  text default '',
  how_to_farm         text default '',
  additional_notes    text default '',
  created_at          timestamptz not null default now()
);

-- ---------- Tracking (your daily farming list) ----------
create table if not exists public.tracking (
  id                uuid primary key default gen_random_uuid(),
  research_id       uuid references public.research(id) on delete set null,
  project_name      text not null,
  link              text default '',
  notes             text default '',
  wallet_notes      jsonb not null default '[]'::jsonb,
  tag_ids           uuid[] not null default '{}',
  last_interaction  date,
  created_at        timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_research_name   on public.research (lower(name));
create index if not exists idx_working_name    on public.working (lower(name));
create index if not exists idx_tracking_name   on public.tracking (lower(project_name));
create index if not exists idx_tracking_tags   on public.tracking using gin (tag_ids);

-- ---------- Row-level security ----------
-- This is a single-user personal app. The simplest setup is to disable RLS so
-- the anon key has full read/write. The anon key still needs to be kept
-- private (treat your .env.local + Vercel env vars as secrets).
alter table public.tags     disable row level security;
alter table public.research disable row level security;
alter table public.working  disable row level security;
alter table public.tracking disable row level security;
