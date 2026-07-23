-- 011: supplier address + social handle, shown in the admin Products table
-- (spec §1.2 lists supplier contact detail, address, phone, website, social,
-- email).
alter table public.suppliers
  add column if not exists address text,
  add column if not exists social text;
