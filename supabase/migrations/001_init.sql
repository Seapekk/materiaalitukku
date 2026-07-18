-- Materiaalitukku MVP schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'provider', 'admin')),
  banned boolean not null default false,
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
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id serial primary key,
  slug text not null unique,
  -- names per language, e.g. {"en": "Plumbing", "et": "Torutööd", "fi": "Putkityöt"}
  name jsonb not null,
  category_group text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Tenders (announcements / jobs)
-- ---------------------------------------------------------------------------
create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  category_id int references public.categories (id),
  type text not null default 'services' check (type in ('goods', 'services')),
  budget numeric,
  country text not null,
  city text not null,
  latitude double precision,
  longitude double precision,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'deleted')),
  rejection_reason text,
  views int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'C')
  ) stored
);

create index tenders_search_idx on public.tenders using gin (search);
create index tenders_status_created_idx on public.tenders (status, created_at desc);
create index tenders_owner_idx on public.tenders (owner_id);

-- Contact details are kept OFF the public tender row (same privacy design as
-- the old app): only the owner and admins can read them.
create table public.tender_contacts (
  tender_id uuid primary key references public.tenders (id) on delete cascade,
  email text,
  phone text
);

-- ---------------------------------------------------------------------------
-- Businesses (service providers / local businesses)
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  tagline text,
  description text not null default '',
  category_ids int[] not null default '{}',
  country text not null,
  city text not null,
  latitude double precision,
  longitude double precision,
  website text,
  email text,
  phone text,
  logo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'deleted', 'banned')),
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'C')
  ) stored
);

create index businesses_search_idx on public.businesses using gin (search);
create index businesses_status_idx on public.businesses (status);
create index businesses_owner_idx on public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_contacts enable row level security;
alter table public.businesses enable row level security;

-- Profiles: users see/update themselves, admins see all.
create policy "profiles own read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles own update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = 'user');
create policy "profiles admin all" on public.profiles
  for all using (public.is_admin());

-- Categories: readable by everyone, writable by admins.
create policy "categories public read" on public.categories
  for select using (true);
create policy "categories admin write" on public.categories
  for all using (public.is_admin());

-- Tenders: approved ones are public; owners and admins see the rest.
create policy "tenders public read" on public.tenders
  for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "tenders owner insert" on public.tenders
  for insert with check (owner_id = auth.uid());
create policy "tenders owner update" on public.tenders
  for update using (owner_id = auth.uid() or public.is_admin());
create policy "tenders admin delete" on public.tenders
  for delete using (public.is_admin());

-- Tender contacts: only owner + admins.
create policy "tender contacts restricted" on public.tender_contacts
  for select using (
    public.is_admin() or exists (
      select 1 from public.tenders t
      where t.id = tender_id and t.owner_id = auth.uid()
    )
  );
create policy "tender contacts owner insert" on public.tender_contacts
  for insert with check (
    exists (
      select 1 from public.tenders t
      where t.id = tender_id and t.owner_id = auth.uid()
    )
  );

-- Businesses: approved ones are public; owners and admins see the rest.
create policy "businesses public read" on public.businesses
  for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "businesses owner insert" on public.businesses
  for insert with check (owner_id = auth.uid());
create policy "businesses owner update" on public.businesses
  for update using (owner_id = auth.uid() or public.is_admin());
create policy "businesses admin delete" on public.businesses
  for delete using (public.is_admin());
