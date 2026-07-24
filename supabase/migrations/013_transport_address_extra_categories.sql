-- 013: transport company street address + the two remaining service categories
-- from the paper spec's equipment line ("kallurauto, tõstuk, hiab, külmauto"):
-- tipper truck and forklift (hiab and reefer were already seeded in 012).
-- Additive + idempotent; safe to run after 012.

alter table public.transport_companies
  add column if not exists address text;

insert into public.categories (slug, parent_slug, name, sort_order, type) values
  ('kallurauto', null, '{"fi": "Kippiauto (kallurauto)", "en": "Tipper truck", "et": "Kallurauto"}', 16, 'transport'),
  ('trukki',     null, '{"fi": "Trukki (nostotrukki)",   "en": "Forklift",     "et": "Tõstuk"}',    17, 'transport')
on conflict (slug) do nothing;
