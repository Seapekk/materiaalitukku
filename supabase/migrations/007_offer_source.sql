-- 007: offer provenance + rejected status, for the 1.2 Products colour coding.
-- Spec colours: user=light green, admin=light blue, scraped=light yellow,
-- not-approved(pending)=light red, rejected=light grey. Supplier identity is
-- hidden from public users for admin- and scraped-sourced offers.

-- Where an offer came from. Submissions approved from the public "Add products"
-- form become 'user'; the admin "Add product" button creates 'admin'; the AI
-- price-scraper creates 'scraped'.
alter table public.offers
  add column source text not null default 'admin'
    check (source in ('user', 'admin', 'scraped'));

-- Allow an explicit 'rejected' state (grey) distinct from 'pending' (red).
alter table public.offers
  drop constraint offers_status_check;
alter table public.offers
  add constraint offers_status_check
    check (status in ('active', 'pending', 'rejected'));

create index offers_source_idx on public.offers (source);
