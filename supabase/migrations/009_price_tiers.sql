-- 009: structured quantity price tiers (spec 1.2: "price per product when
-- ordered 100, 1000 or 10000"). unit_price stays the 1-piece price; price_tiers
-- holds the higher-quantity breaks as an ordered JSON array of
-- {"qty": number, "price": number} (€/unit at/above that quantity).
alter table public.offers
  add column if not exists price_tiers jsonb not null default '[]'::jsonb;

alter table public.submissions
  add column if not exists raw_price_tiers jsonb not null default '[]'::jsonb;
