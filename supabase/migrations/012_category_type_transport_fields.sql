-- 012: split categories into construction vs transport, seed the transport
-- service-type categories, and extend transport_companies with the fields the
-- new /addbusiness carrier form collects (reg number, socials, per-type "from"
-- pricing). Run after 011_supplier_address_social.sql.

-- ---------------------------------------------------------------------------
-- Category type: the existing product tree is "construction"; the freight
-- service types (FTL, LTL, Hiab, ADR, …) live in the same table as
-- "transport", managed from the same admin screen via a split toggle.
-- ---------------------------------------------------------------------------
alter table public.categories
  add column type text not null default 'construction'
    check (type in ('construction', 'transport'));

-- Seed transport service-type categories (flat, top-level). Slugs are the
-- values persisted on transport_companies.services and matched by the public
-- carrier filter, so keep them stable.
insert into public.categories (slug, parent_slug, name, sort_order, type) values
  ('ftl',            null, '{"fi": "FTL (Täyskuorma)",        "en": "FTL (Full load)",          "et": "FTL (Täiskoorem)"}',        1,  'transport'),
  ('ltl',            null, '{"fi": "LTL (Osakuorma)",         "en": "LTL (Part load)",          "et": "LTL (Osakoorem)"}',         2,  'transport'),
  ('pikakuljetus',   null, '{"fi": "Pikakuljetus (Express)",  "en": "Express delivery",         "et": "Kiirvedu (Express)"}',      3,  'transport'),
  ('yleisrahti',     null, '{"fi": "Yleisrahti",              "en": "General freight",          "et": "Üldveos"}',                 4,  'transport'),
  ('reefer',         null, '{"fi": "Lämpösäädelty (Reefer)",  "en": "Refrigerated (reefer)",    "et": "Külmvedu (reefer)"}',       5,  'transport'),
  ('adr',            null, '{"fi": "Vaaralliset aineet (ADR)","en": "Dangerous goods (ADR)",    "et": "Ohtlik veos (ADR)"}',       6,  'transport'),
  ('sailio',         null, '{"fi": "Säiliökuljetus",          "en": "Liquid / bulk tanker",     "et": "Paakvedu"}',                7,  'transport'),
  ('bulk',           null, '{"fi": "Bulk / irtotavara",       "en": "Bulk transport",           "et": "Puistematerjali vedu"}',    8,  'transport'),
  ('kontti',         null, '{"fi": "Konttikuljetus",          "en": "Container transport",      "et": "Konteinervedu"}',           9,  'transport'),
  ('lavetti',        null, '{"fi": "Lavetti / matalalava",    "en": "Low-loader / flatbed",     "et": "Madelvedu"}',               10, 'transport'),
  ('erikoiskuljetus',null, '{"fi": "Erikoiskuljetus (ylisuuret)","en": "Oversized / heavy load","et": "Eriveos (ülemõõduline)"}',  11, 'transport'),
  ('hiab',           null, '{"fi": "Hiab (nosturiauto)",      "en": "Hiab (crane truck)",       "et": "Hiab (kraanaauto)"}',       12, 'transport'),
  ('hinaus',         null, '{"fi": "Hinaus",                  "en": "Towing",                   "et": "Puksiirvedu"}',             13, 'transport'),
  ('peralauta',      null, '{"fi": "Perälautanostin",         "en": "Tail-lift transport",      "et": "Tõstelauaga vedu"}',        14, 'transport'),
  ('autonkuljetus',  null, '{"fi": "Autonkuljetus",           "en": "Car carrier transport",    "et": "Autovedu"}',                15, 'transport')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Transport company extra fields.
--  * reg_number    – business registration number
--  * socials       – [{platform, url}] multi-select (whatsapp/facebook/…)
--  * service_prices – { <category-slug>: <from-price €> } per selected type
-- ---------------------------------------------------------------------------
alter table public.transport_companies
  add column reg_number text,
  add column socials jsonb not null default '[]',
  add column service_prices jsonb not null default '{}';
