-- 0001_reference_data.sql
--
-- Stage 1 of introducing Postgres: reference data ONLY. No auth, no user
-- data, nothing PDPA-relevant — these two tables replace the two static
-- JSON files DriveReady ships today (public/data/cars.json,
-- public/data/coe-history.json), which currently can only be updated by
-- committing a diff and redeploying.
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste -> Run). There is no automated migration runner wired up
-- yet, so future migrations in this folder are applied the same manual way
-- until that's worth building.

-- ── cars ──────────────────────────────────────────────────────────────────
-- Mirrors public/data/cars.json's per-car object. Deliberately does NOT
-- store `coe` or `loanCap` — those are DERIVED from omv (see omvToLtv() in
-- src/lib/drive/calc.js) precisely because storing them as independently
-- editable fields is what let 53 cars drift out of sync with their own omv
-- in the JSON file (some over-lending by 10 percentage points). The read
-- path re-derives them from omv every time, so there is no column here to
-- drift.
create table if not exists public.cars (
  id               text primary key,
  name             text not null,
  short            text not null,
  type             text not null,
  price            integer not null check (price > 0),
  omv              integer not null check (omv > 0),
  rate_tier        text not null check (rate_tier in ('ice', 'green', 'tesla')),
  top5             boolean not null default false,
  rank             integer,                 -- only meaningful when top5 = true
  description      text,
  ves              integer not null default 0,
  ves_band         text,
  subtotal_ex_coe  integer,                 -- Tesla only (direct-sale ex-COE subtotal)
  updated_at       timestamptz not null default now()
);

comment on table public.cars is
  'DriveReady car catalog — replaces public/data/cars.json. Refreshed by scripts/refresh-cars.mjs.';

-- ── coe_bidding_results ──────────────────────────────────────────────────
-- One row per (month, bidding_no) exercise, both categories combined —
-- mirrors public/data/coe-history.json's entry shape. Primary key on the
-- natural key (not a surrogate id) makes upsert-by-refresh idempotent:
-- re-running the refresh script for an exercise LTA later revises just
-- overwrites the row rather than duplicating it.
create table if not exists public.coe_bidding_results (
  month           text not null,            -- 'YYYY-MM'
  bidding_no      integer not null,
  cat_a_premium   integer not null,
  cat_a_quota     integer not null,
  cat_a_bids      integer not null,
  cat_b_premium   integer not null,
  cat_b_quota     integer not null,
  cat_b_bids      integer not null,
  recorded_at     timestamptz not null default now(),
  primary key (month, bidding_no)
);

comment on table public.coe_bidding_results is
  'COE bidding history — replaces public/data/coe-history.json. Source: data.gov.sg mirror of LTA''s COE Bidding Results dataset. Refreshed by scripts/refresh-coe-history.mjs.';

create index if not exists coe_bidding_results_month_idx
  on public.coe_bidding_results (month desc, bidding_no desc);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Public, read-only reference data: anyone (the anon key, used by the app's
-- API routes) can SELECT. Nobody can INSERT/UPDATE/DELETE except
-- service_role, which bypasses RLS entirely and is used only by the
-- refresh scripts (never shipped to the browser). No auth.uid() involved
-- anywhere in these policies — this is intentionally the same trust model
-- as a public CDN file, just queryable.
alter table public.cars enable row level security;
alter table public.coe_bidding_results enable row level security;

create policy "cars are publicly readable"
  on public.cars for select
  to anon, authenticated
  using (true);

create policy "coe_bidding_results are publicly readable"
  on public.coe_bidding_results for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies are created for anon/authenticated —
-- absence of a policy denies by default once RLS is enabled, so writes
-- from the anon key are rejected. Only service_role can write.
