-- 014: per-language translations of a transport company's free-text description.
-- The carrier types their "Esittely" in whatever language they like; admins
-- translate it into Finnish/English/Swedish for the public listing.
-- { "fi": "...", "en": "...", "sv": "..." }. Additive + idempotent.

alter table public.transport_companies
  add column if not exists description_translations jsonb not null default '{}';
