-- 008: app settings (key/value) + product image verification status.
-- Backs the dashboard "image verification" toggle and "images blocked" count.

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "app_settings public read" on public.app_settings
  for select using (true);
create policy "app_settings admin write" on public.app_settings
  for all using (public.is_admin());

insert into public.app_settings (key, value)
  values ('image_verification_enabled', 'false')
  on conflict (key) do nothing;

-- Per-product-name image moderation state. 'pending' until reviewed; 'blocked'
-- images are hidden from the public site and counted on the dashboard.
alter table public.products
  add column if not exists image_status text not null default 'pending'
    check (image_status in ('pending', 'approved', 'blocked'));

create index if not exists products_image_status_idx
  on public.products (image_status);
