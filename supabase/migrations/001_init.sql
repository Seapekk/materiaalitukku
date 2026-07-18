-- Materiaalitukku MVP schema (building-materials price comparison)
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user (admins log in; the public browses freely)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Categories: two-level tree (parent_slug null = top level)
-- ---------------------------------------------------------------------------
create table public.categories (
  id serial primary key,
  slug text not null unique,
  parent_slug text references public.categories (slug),
  -- names per language, e.g. {"fi": "Puutavara", "en": "Timber", "et": "Puit"}
  name jsonb not null,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Products ("Nimikkeet": one row per standard catalogue item, Finnish-first)
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category_slug text references public.categories (slug),
  unit text not null default 'kpl',        -- kpl / m2 / jm / m3
  image_url text,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored
);

create index products_search_idx on public.products using gin (search);
create index products_category_idx on public.products (category_slug, status);

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'fi',      -- ISO code lowercase: fi / ee / de / pl / ...
  email text,
  phone text,
  website text,
  lead_time text,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Offers: a supplier's price for a product (prices are € / unit, VAT 0%)
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  unit_price numeric not null,             -- single-piece price
  wholesale_price numeric,                 -- price at/above min_wholesale_qty
  min_wholesale_qty numeric,
  transport_small numeric not null default 0,  -- flat € per order to Finland, small order
  transport_bulk numeric not null default 0,   -- flat € per order to Finland, bulk order
  status text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, supplier_id)
);

create index offers_product_idx on public.offers (product_id, status);

-- ---------------------------------------------------------------------------
-- Transport companies directory
-- ---------------------------------------------------------------------------
create table public.transport_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  route text not null default '',          -- e.g. "EE ⇄ FI"
  days text not null default '',           -- e.g. "Mon, Wed, Fri"
  services text[] not null default '{}',
  capacity text,
  email text,
  phone text,
  website text,
  description text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Submissions: suppliers propose products/prices via the public form;
-- admin reviews and turns them into products + offers.
-- ---------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_email text not null,
  supplier_country text not null default 'fi',
  supplier_id uuid references public.suppliers (id),
  raw_name text not null,
  raw_description text not null default '',
  raw_unit text not null default 'kpl',
  raw_unit_price numeric not null,
  raw_wholesale_price numeric,
  raw_min_wholesale_qty numeric,
  raw_transport_small numeric,
  raw_transport_bulk numeric,
  category_slug text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.offers enable row level security;
alter table public.transport_companies enable row level security;
alter table public.submissions enable row level security;

-- Profiles: users see themselves, admins see all.
create policy "profiles own read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles admin all" on public.profiles
  for all using (public.is_admin());

-- Public catalogue data: everyone reads, only admins write.
create policy "categories public read" on public.categories
  for select using (true);
create policy "categories admin write" on public.categories
  for all using (public.is_admin());

create policy "products public read" on public.products
  for select using (status = 'active' or public.is_admin());
create policy "products admin write" on public.products
  for all using (public.is_admin());

create policy "suppliers public read" on public.suppliers
  for select using (true);
create policy "suppliers admin write" on public.suppliers
  for all using (public.is_admin());

create policy "offers public read" on public.offers
  for select using (status = 'active' or public.is_admin());
create policy "offers admin write" on public.offers
  for all using (public.is_admin());

create policy "transport public read" on public.transport_companies
  for select using (true);
create policy "transport admin write" on public.transport_companies
  for all using (public.is_admin());

-- Submissions: anyone may submit; only admins may read/manage them.
create policy "submissions public insert" on public.submissions
  for insert with check (true);
create policy "submissions admin read" on public.submissions
  for select using (public.is_admin());
create policy "submissions admin write" on public.submissions
  for update using (public.is_admin());
create policy "submissions admin delete" on public.submissions
  for delete using (public.is_admin());
