-- 010: per-language translations of product names (spec 1.1). The base `name`
-- stays Finnish; name_translations holds { "<lang>": "<translated name>" }.
alter table public.products
  add column if not exists name_translations jsonb not null default '{}'::jsonb;
