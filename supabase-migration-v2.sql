-- ============================================================
-- Migration v2: cryptorank import + farming stages
-- Run once in the Supabase SQL editor on top of supabase-schema.sql.
-- Safe to run multiple times.
-- ============================================================

-- ---------- 1. cryptorank_key on research (idempotent XLSX imports) ----------
alter table public.research
  add column if not exists cryptorank_key text;

create unique index if not exists idx_research_cryptorank_key
  on public.research (cryptorank_key)
  where cryptorank_key is not null;

-- ---------- 2. Stages (farming progress: waitlist / testnet / mainnet / claimed …) ----------
create table if not exists public.stages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text not null default '#22c55e',
  created_at  timestamptz not null default now()
);

alter table public.stages disable row level security;

-- ---------- 3. tracking.stage_id ----------
alter table public.tracking
  add column if not exists stage_id uuid references public.stages(id) on delete set null;

create index if not exists idx_tracking_stage_id on public.tracking (stage_id);
