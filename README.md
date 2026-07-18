# Materiaalitukku (rebuild)

Clean rebuild of materiaalitukku.com: a building-materials price comparison for
Finland. Compare each supplier's unit price, wholesale price and freight — the true
landed cost — across FI/EE/DE/PL suppliers.

**Stack:** Next.js 15 (App Router, server rendering) · Supabase (Postgres, Auth) ·
Tailwind CSS · next-intl (fi / et / en, Finnish default).

## What's included (MVP)

- Landing page with category grid
- Price comparison catalogue: full-text search + category filter, cheapest
  "from" price per product
- Product page with the supplier comparison table: quantity input, single vs.
  wholesale pricing, small/bulk freight, landed total and landed €/unit, best offer
  and best-Finnish-offer highlighting, savings calculation (logic ported 1:1 from
  the old app's `utils/pricing.ts`)
- Suppliers directory and transport companies directory
- Public "Add products" form for suppliers — submissions land in a review queue
- Admin review queue: approving a submission auto-creates the supplier (matched by
  email), the product and the offer; database rules (RLS) keep everything else
  read-only to the public
- All prices stored € / unit, VAT 0%

## Setup (one time, ~10 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier
   is fine).

2. **Create the database tables.** In the Supabase dashboard open *SQL Editor*, paste
   the contents of [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
   and run it. Then run [`supabase/seed.sql`](supabase/seed.sql) the same way to add
   the category tree (ported from the old app).

3. **Configure the app.** Copy `.env.example` to `.env.local` and fill in the two
   values from *Project Settings → API* in the Supabase dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` `public` key

4. **Run it:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000

5. **Make yourself admin.** Register via Supabase dashboard (*Authentication → Users
   → Add user*, with "Auto confirm") or the app's `/login` after creating a user,
   then in the *SQL Editor* run:

   ```sql
   update public.profiles set role = 'admin' where email = 'seapekk1@gmail.com';
   ```

   After that the *Admin* link appears in the header and `/admin` shows the
   submission review queue.

## Deploying (Netlify)

1. Push the repo to GitHub.
2. In Netlify: *Add new site → Import an existing project* and pick the repo.
   Netlify detects Next.js automatically — no extra config.
3. Under *Site configuration → Environment variables*, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy, then point the materiaalitukku.com domain at the site and set the same
   URL as the Site URL in Supabase (*Authentication → URL Configuration*).

## Not yet ported from the old app

Product images, the scraped retail prices ("ScrapedPrice") pipeline, admin tabs for
editing products/suppliers/transport/categories in the UI (use the Supabase table
editor meanwhile), messages/notes/logs tabs, and migrating existing Firestore data.
Add these incrementally — the schema is designed to grow.
