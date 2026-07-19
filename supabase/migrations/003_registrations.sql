-- 003: partner registrations from the Hinnoittelu page
-- (product / supplier / transport packages). Run after 002.

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  reg_type text not null check (reg_type in ('product', 'supplier', 'transport')),
  company_name text not null,
  email text not null,
  phone text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz not null default now()
);

alter table public.registrations enable row level security;

create policy "registrations public insert" on public.registrations
  for insert with check (true);
create policy "registrations admin read" on public.registrations
  for select using (public.is_admin());
create policy "registrations admin write" on public.registrations
  for update using (public.is_admin());
create policy "registrations admin delete" on public.registrations
  for delete using (public.is_admin());
