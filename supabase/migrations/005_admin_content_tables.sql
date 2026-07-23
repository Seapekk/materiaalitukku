-- 005: admin-only content tables that didn't exist before the full admin
-- dashboard port -- activity log, internal notes, site footer config.
-- Run after 004_supplier_transport_lifecycle.sql.

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  category text not null,   -- 'products' | 'offers' | 'suppliers' | 'transport' | 'categories' | ...
  action text not null,     -- human-readable summary, e.g. 'Created product "Havuvaneri 21mm"'
  details jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at desc);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'GENERAL'
    check (category in ('PRICING', 'LOGISTICS', 'PURCHASING', 'PROJECTS', 'GENERAL')),
  color text not null default 'bg-yellow-50',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton row: id is always literally `true`, so a second row is impossible.
create table public.footer_config (
  id boolean primary key default true check (id),
  company_name text not null default '',
  description text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  copyright text not null default '',
  links jsonb not null default '[]'::jsonb,   -- [{ "title": "...", "url": "..." }, ...]
  updated_at timestamptz not null default now()
);
insert into public.footer_config (id) values (true);

alter table public.activity_logs enable row level security;
alter table public.admin_notes enable row level security;
alter table public.footer_config enable row level security;

create policy "activity logs admin only" on public.activity_logs
  for all using (public.is_admin());
create policy "admin notes admin only" on public.admin_notes
  for all using (public.is_admin());

-- Footer config: everyone reads (the public footer renders it), admins write.
create policy "footer config public read" on public.footer_config
  for select using (true);
create policy "footer config admin write" on public.footer_config
  for all using (public.is_admin());
