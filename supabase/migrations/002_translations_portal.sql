-- 002: dynamic translations + Yhteystiedot portal (messages, price change requests)
-- Run this in the Supabase SQL Editor after 001_init.sql.

-- Dynamic UI translations. One row per message key; `values` maps a language
-- code ("de", "sv", …) to the translated text. Finnish base text lives in the
-- app bundle (messages/fi.json) — the UI falls back to it, so missing rows or
-- languages never render blank.
create table if not exists public.translations (
  key text primary key,
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Contact messages from the Yhteystiedot form.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_email text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Supplier price change requests from the Muuta hintoja form.
-- Applied to the offer only when an admin approves.
create table if not exists public.price_change_requests (
  id uuid primary key default gen_random_uuid(),
  supplier_email text not null,
  offer_id uuid not null references public.offers(id) on delete cascade,
  new_unit_price numeric not null check (new_unit_price > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.translations enable row level security;
alter table public.messages enable row level security;
alter table public.price_change_requests enable row level security;

-- Translations: everyone reads (the site needs them to render), admins manage.
create policy "translations public read" on public.translations
  for select using (true);
create policy "translations admin write" on public.translations
  for all using (public.is_admin());

-- Messages: anyone may send; only admins read/manage.
create policy "messages public insert" on public.messages
  for insert with check (true);
create policy "messages admin read" on public.messages
  for select using (public.is_admin());
create policy "messages admin write" on public.messages
  for update using (public.is_admin());
create policy "messages admin delete" on public.messages
  for delete using (public.is_admin());

-- Price change requests: anyone may request; only admins read/manage.
create policy "price requests public insert" on public.price_change_requests
  for insert with check (true);
create policy "price requests admin read" on public.price_change_requests
  for select using (public.is_admin());
create policy "price requests admin write" on public.price_change_requests
  for update using (public.is_admin());
create policy "price requests admin delete" on public.price_change_requests
  for delete using (public.is_admin());
