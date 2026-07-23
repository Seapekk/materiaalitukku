-- 004: supplier/transport-company lifecycle + structured transport routes.
-- Run after 003_registrations.sql.

-- Lifecycle: 2 stored states ("active"/"rejected"); "expired" is computed
-- from expires_at at read time, never stored, so no cron/trigger is needed.
alter table public.suppliers
  add column status text not null default 'active' check (status in ('active', 'rejected')),
  add column expires_at timestamptz not null default (now() + interval '365 days'),
  add column rejected_at timestamptz,
  add column rejection_reason text;

alter table public.transport_companies
  add column status text not null default 'active' check (status in ('active', 'rejected')),
  add column expires_at timestamptz not null default (now() + interval '365 days'),
  add column rejected_at timestamptz,
  add column rejection_reason text;

-- Structured route instead of a formatted display string like "EE -> FI"
-- (the old AI Studio app stored/matched routes as free text, which broke
-- both the country filter and the flag rendering for round-trips).
-- The table has no seed rows, so this is a zero-data-loss change.
alter table public.transport_companies
  drop column route,
  add column origin_country text not null default 'ee' check (char_length(origin_country) = 2),
  add column direction text not null default 'roundtrip' check (direction in ('inbound', 'outbound', 'roundtrip'));

-- Per-service prices: /addbusiness already collects these on the carrier
-- registration form, but there was nowhere to store them, so they were
-- silently discarded on approval. Nullable: "ask for price" services
-- (thermo/crane/special) never set one.
alter table public.transport_companies
  add column ftl_price numeric,
  add column ltl_price numeric,
  add column express_price numeric;

-- Registrations gain a real "rejected" disposition (previously only pending/done).
alter table public.registrations
  drop constraint registrations_status_check,
  add constraint registrations_status_check check (status in ('pending', 'done', 'rejected'));

-- Public listings must only show active suppliers/carriers now that a
-- status column exists (the pre-004 "select using (true)" predates it).
drop policy "suppliers public read" on public.suppliers;
create policy "suppliers public read" on public.suppliers
  for select using (status = 'active' or public.is_admin());

drop policy "transport public read" on public.transport_companies;
create policy "transport public read" on public.transport_companies
  for select using (status = 'active' or public.is_admin());
