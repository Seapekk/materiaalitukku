# Materiaalitukku rebuild — To-do list

_Last updated: 2026-07-21_

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

## 1. Supabase — run once in the SQL Editor, **in order** (**next up, still
      none of this has been run as of 2026-07-20 — blocks all admin testing**)
- [ ] Run `supabase/migrations/002_translations_portal.sql`
      (translations + messages + price_change_requests tables)
- [ ] Run `supabase/migrations/003_registrations.sql` (partner registrations)
- [ ] Run `supabase/migrations/004_supplier_transport_lifecycle.sql`
      (adds status/expiry to suppliers + transport_companies, replaces
      transport_companies.route with structured origin_country/direction,
      adds ftl_price/ltl_price/express_price — depends on 003)
- [ ] Run `supabase/migrations/005_admin_content_tables.sql`
      (activity_logs, admin_notes, footer_config tables)
- [ ] Run `supabase/migrations/006_scraped_prices.sql`
      (AI price-scraping staging table — depends on 005 only for ordering,
      no hard dependency)
- [ ] Add `GEMINI_API_KEY=` to `.env.local`
      (free key: https://aistudio.google.com/apikey) — **now required** for
      AI translation (site-wide + per-category) and the new AI price-scraper,
      not just optional

## 2. First real data + full loop test — all untested live, no admin
      account exists yet as of 2026-07-20 (see §1 — nothing's been run)
- [ ] Create admin user (Supabase → Authentication → Add user, auto-confirm),
      log in once, then in SQL Editor:
      `update public.profiles set role = 'admin' where email = 'seapekk1@gmail.com';`
- [ ] Click through all 10 tabs at /admin, /admin/{categories,suppliers,
      products,offers,transport,messages,notes,footer,logs}, /admin/translations
- [ ] Add a product via ADD PRODUCTS → approve in /admin → check it appears on
      the front page with prices, modal, and on the Toimittajat page
- [ ] Register a transport company via /addbusiness?type=transport → approve
      in /admin/transport → check it shows a real (not "~arvio") price on
      /transport for its own service classes
- [ ] Try the AI price-scraper on a real competitor product page from
      /admin/products (needs GEMINI_API_KEY)
- [ ] AI-translate the UI to sv/de/pl… in /admin/translations and a category
      name in /admin/categories

## 3. Modular admin portal — DONE (all 6 phases), ported from the July AI
      Studio export's 11-tab AdminPortal but redesigned around this app's
      real Supabase schema (built 2026-07-20/21, see chat history for the
      full design rationale — nothing here has been manually tested live yet)
- [x] Phase 0 — foundations: `src/lib/supabase/admin.ts` (shared
      requireAdminPage/requireAdminAction, replacing 3 copy-pasted auth
      blocks), `src/lib/logs.ts` (logActivity, wired into every mutation),
      `src/lib/lifecycle.ts` + `<LifecycleBadge>` (active/expired/rejected,
      shared by suppliers & transport), `src/app/[locale]/admin/layout.tsx` +
      `<AdminNav>` (one auth gate + tab strip for the whole /admin/* tree)
- [x] Phase 1 — core marketplace management (previously had **zero** admin
      UI beyond raw SQL): Categories (CRUD + per-row AI-translate-missing,
      via new shared `src/lib/gemini-translate.ts`), Suppliers (CRUD +
      active/expired/rejected lifecycle + registration approval), Products
      (catalog CRUD, deliberately split from pricing), Offers (per-supplier
      pricing CRUD, linked to Products+Suppliers via selects, not inline
      creation)
- [x] Phase 2 — Transport Companies (CRUD + lifecycle + route builder:
      origin country + inbound/outbound/roundtrip direction + FTL/LTL/Express/
      Thermo/Crane/Special services with per-service pricing + registration
      approval). Also: added `ftl_price`/`ltl_price`/`express_price` columns
      (the /addbusiness form already collected these but nothing stored
      them), fixed `addbusiness.tsx` to send raw `routeCountry`/
      `routeDirection` instead of a formatted string, and wired the public
      `/transport` page (`kuljetus.tsx`) to show a carrier's real submitted
      price (marked "~arvio" when estimated) instead of always faking one
      from a per-card multiplier
- [x] Phase 3 — Messages tab (full CRUD incl. delete, which the original
      never had; main /admin dashboard's inline unread list shrunk to a
      count+link), Notes tab (new, `admin_notes` table), Footer tab (new,
      `footer_config` singleton row) + `src/components/footer.tsx` now reads
      it as an *overlay* on top of the translated defaults (company name/
      description/copyright override if set, contact info + up to 3 extra
      links append rather than replacing the existing translated nav links)
- [x] Phase 4 — Logs viewer: read-only over `activity_logs` (category
      filter, expandable JSON detail, purge-all), capped at the latest 200
      rows. The write side has been live since Phase 0 — every mutating
      action across every tab already calls `logActivity`
- [x] Phase 5 — AI price-scraping, embedded as a panel in `/admin/products`
      (not its own route): admin pastes a competitor product URL, server
      strips HTML and sends the text to Gemini for structured extraction
      (`src/app/[locale]/admin/products/scrape-actions.ts`), result lands in
      `scraped_prices` as `pending` for review — Accept resolves-or-creates
      a supplier by name and upserts an offer at that price, Reject just
      marks it rejected. Deliberately NOT live web search — see chat history
      2026-07-20 for why (Gemini search-grounding + JSON output isn't
      available on the gemini-2.0-flash model this app uses elsewhere)
- Dropped vs. the original by deliberate decision (see chat 2026-07-20):
  banned-email list (redundant — registrations are already admin-reviewed),
  a separate "Templates" tab (collapsed into Products — the schema already
  unifies what the original split across two Firestore collections),
  System tab (was unreachable in the original's own nav) and Proposals tab
  (dead code, superseded by inline approval already on the main /admin page)
- Verification done so far: `tsc --noEmit`, `eslint`, `npm run build` all
  clean after every phase; unauthenticated smoke test confirms all 11
  `/admin/*` routes 307-redirect to `/login` with no server errors; headless
  screenshot of the public `/transport` page confirms no visual regression.
  **Not yet tested as a logged-in admin** — blocked on §1/§2 above.

## 3b. Other remaining items from the July export
- [x] addproducts / addbusiness pages' exact July markup (2026-07-20):
      new `addproducts.tsx` / `addbusiness.tsx` components are 1:1 ports of
      the July App.tsx sections (same wording, classes, tier pricing,
      route/service selectors); `/addbusiness` now renders the new
      component, `/hinnoittelu` redirects to `/addproducts` (they were the
      same view in the source), header nav + footer "Add Products" link
      repointed at `/addproducts`; old `registration-form.tsx` (the
      Malli A/B/C pricing-card page invented in an earlier pass, not in
      the AI Studio export) deleted
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
