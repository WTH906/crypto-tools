-- ============================================================
-- Migration v4: scraper_projects table (CryptoRank / ICO Analytics data)
-- Run after supabase-migration-v3.sql.
-- ============================================================

create table if not exists public.scraper_projects (
  key                text primary key,
  name               text not null,
  symbol             text,
  type               text,
  life_cycle         text,
  category           text,
  original_tags      jsonb not null default '[]',
  custom_tags        jsonb not null default '[]',
  funding_stage      text,
  funding_date       text,
  funding_raise      double precision,
  funding_valuation  double precision,
  investors          jsonb not null default '[]',
  logo_url           text,
  cryptorank_url     text,
  notes              text not null default '',
  deleted            boolean not null default false,
  raw_data           jsonb not null default '{}',
  first_seen         timestamptz not null default now(),
  last_modified      timestamptz not null default now()
);

create index if not exists idx_scraper_projects_funding_date
  on public.scraper_projects (funding_date desc nulls last);

create index if not exists idx_scraper_projects_last_modified
  on public.scraper_projects (last_modified desc);

alter table public.scraper_projects disable row level security;
