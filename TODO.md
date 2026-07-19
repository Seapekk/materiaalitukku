# Materiaalitukku rebuild — To-do list

_Last updated: 2026-07-19 (evening)_

## 0. Done so far
- [x] MVP rebuilt (Next.js 15 + Supabase, pricing logic ported 1:1)
- [x] Builds and serves cleanly; local git on branch `main`
- [x] GitHub account created (2026-07-18), repo pushed (2026-07-19)
- [x] Supabase project created; `001_init.sql` + `seed.sql` run (2026-07-19)
- [x] `.env.local` filled in; app connects to Supabase

### Design & pages (ported from the AI Studio app, 2026-07-19)
- [x] Design system: IBM Plex Sans/Mono, blue #1450A3, black borders, hard
      shadows, no rounded corners (`globals.css`: `.btn-brutal`, `.input-brutal`…)
- [x] Header 1:1 from the **July 18 export** (`~/Downloads/materiaalitukku/`):
      tabs Hintavertailu/Kuljetusyritykset/Toimittajat, buttons ADD PRODUCTS
      (green) / ADD BUSINESS (purple) / YHTEYSTIEDOT (blue) / YLLÄPITO (red),
      mobile hamburger menu, EU flag language selector
- [x] Front page = full Hintavertailu view: filter card, category chips,
      black-header table with dual VAT prices, savings badges, pagination,
      product modal (Määrä strip, per-offer rows, TUKKU badge, sis. alv lines)
- [x] /transport = redesigned Kuljetusyritykset page: flag bar, 50 €/vuosi ad,
      FTL/LTL/Express cards, 26-country route selector, service filters + sort,
      priced carrier cards with SEND EMAIL / CALL
- [x] /suppliers = Toimittajat page: filters, country quick-badges, cards
      grouped by category (categories derived from each supplier's offers)
- [x] /hinnoittelu (pricing cards A/B/C + registration form),
      /addbusiness (type preselect), /yhteystiedot + /muuta-hintoja portal
      (contact form + price change requests), July footer, floating ↑ button
- [x] Translation system: 23 EU locales, Finnish fallback (never blank),
      DB overlay (`translations` table), flag switcher + localStorage
      persistence, /admin/translations dashboard (inline edit, CSV
      export/import, Gemini AI mass-translate with strict abort-on-error)
- [x] Admin: submissions approve/reject, partner messages, price change
      requests (approve = writes offer price), partner registrations,
      link to translations dashboard

## 1. Supabase — run once in the SQL Editor (**next up**)
- [ ] Run `supabase/migrations/002_translations_portal.sql`
      (translations + messages + price_change_requests tables)
- [ ] Run `supabase/migrations/003_registrations.sql` (partner registrations)
- [ ] Optional: add `GEMINI_API_KEY=` to `.env.local`
      (free key: https://aistudio.google.com/apikey) to enable AI translation

## 2. First real data + full loop test
- [ ] Create admin user (Supabase → Authentication → Add user, auto-confirm),
      log in once, then in SQL Editor:
      `update public.profiles set role = 'admin' where email = 'seapekk1@gmail.com';`
- [ ] Add a product via ADD PRODUCTS → approve in /admin → check it appears on
      the front page with prices, modal, and on the Toimittajat page
- [ ] Add a transport company (table editor or /addbusiness) so
      /transport shows carrier cards
- [ ] AI-translate the UI to sv/de/pl… in /admin/translations

## 3. Still to port from the July AI Studio export
- [ ] Modular admin portal (Products / Suppliers / Transport / Categories /
      Templates / Translations / Messages / Logs / Notes / System tabs) —
      current admin is a simpler single page
- [ ] addproducts / addbusiness pages' exact July markup (currently use the
      earlier registration-form layout)
- [ ] Product images (Supabase Storage upload; list/modal already display
      `image_url` when set)
- [ ] Offer staleness highlighting (lastUpdated colouring) if wanted

## 4. Before going live
- [ ] Deploy to Netlify (import GitHub repo; set the two
      `NEXT_PUBLIC_SUPABASE_*` env vars + optional `GEMINI_API_KEY`)
- [ ] Point materiaalitukku.com at Netlify; set Supabase Auth Site URL to
      https://materiaalitukku.com
- [ ] Migrate real data out of the old Firestore project (products, suppliers,
      offers, transport companies)
- [ ] Privacy policy + legal pages; favicon + og-image
- [ ] robots.txt + sitemap, Google Search Console

## 5. Housekeeping (once live)
- [ ] Weekly database backup (`pg_dump` or Supabase scheduled backups)
- [ ] Error monitoring (Sentry free tier)
- [ ] Privacy-friendly analytics (Plausible/Umami)
- [ ] Spam protection on the public forms if bots appear (Cloudflare Turnstile)
