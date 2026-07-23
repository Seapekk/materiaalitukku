-- 006: AI price-scraping staging table. Admin pastes a competitor product
-- URL; Gemini extracts a price from the fetched page text (see
-- src/app/[locale]/admin/products/scrape-actions.ts). Nothing here is ever
-- shown publicly until an admin explicitly accepts it into a real offer.
-- Run after 005_admin_content_tables.sql.

create table public.scraped_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_url text not null,
  supplier_name text not null,
  product_title text not null,
  price numeric not null check (price > 0),
  unit text not null default 'kpl',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index scraped_prices_product_idx on public.scraped_prices (product_id, status);

alter table public.scraped_prices enable row level security;
create policy "scraped prices admin only" on public.scraped_prices
  for all using (public.is_admin());
