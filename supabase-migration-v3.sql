-- ============================================================
-- Migration v3: Daily tasks (Notion-style table with checkbox columns per wallet)
-- Run after supabase-migration-v2.sql.
--
-- Design note: there is NO "reset job". A daily check is just a row keyed by
-- (task, wallet, date). "Today's state" is a query filtered by today's date,
-- so tomorrow's date is a different filter and nothing renders as checked —
-- automatic reset, zero infra. The 1am rollover is handled client-side by
-- subtracting 1 hour from `now` before taking the local date.
-- ============================================================

-- ---------- daily_wallets ----------
-- The wallet "columns" of the table (0xb, 0xe, …). Shared across all daily tasks.
create table if not exists public.daily_wallets (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_daily_wallets_sort on public.daily_wallets (sort_order);

alter table public.daily_wallets disable row level security;

-- ---------- daily_tasks ----------
-- The persistent task rows. Each row appears every day.
create table if not exists public.daily_tasks (
  id           uuid primary key default gen_random_uuid(),
  link         text not null default '',
  notes        text not null default '',
  other_notes  text not null default '',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_daily_tasks_sort on public.daily_tasks (sort_order);

alter table public.daily_tasks disable row level security;

-- ---------- daily_checks ----------
-- One row per (task, wallet, day) that was ticked.
-- check_date is computed client-side as (now - 1 hour).local_date so 00:00–00:59
-- still counts as yesterday.
create table if not exists public.daily_checks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.daily_tasks(id) on delete cascade,
  wallet_id   uuid not null references public.daily_wallets(id) on delete cascade,
  check_date  date not null,
  created_at  timestamptz not null default now(),
  unique (task_id, wallet_id, check_date)
);

create index if not exists idx_daily_checks_lookup
  on public.daily_checks (check_date, task_id, wallet_id);

alter table public.daily_checks disable row level security;
