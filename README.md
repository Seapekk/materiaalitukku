# Materiaalitukku (rebuild)

Clean rebuild of materiaalitukku.com: a marketplace where people post tenders/announcements
and local contractors and businesses get found.

**Stack:** Next.js 15 (App Router, server rendering) · Supabase (Postgres, Auth) ·
Tailwind CSS · next-intl (et / fi / en).

## What's included (MVP)

- Landing page, tender listing with full-text search + category/country filters,
  tender detail, "post a tender" form
- Business directory with search + filters, business profiles, "add your business" form
- Email/password auth (register, login, logout) via Supabase
- Moderation workflow: new tenders/businesses start as `pending`, admins approve or
  reject them at `/admin`
- Contact-detail privacy: tender contact info lives in a separate table that only the
  owner and admins can read (enforced by Postgres row-level security)
- Estonian (default), Finnish and English with language-prefixed URLs (`/et/...`),
  server-rendered for SEO — no meta-tag injection hacks needed

## Setup (one time, ~10 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier
   is fine).

2. **Create the database tables.** In the Supabase dashboard open *SQL Editor*, paste
   the contents of [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
   and run it. Then run [`supabase/seed.sql`](supabase/seed.sql) the same way to add
   the starter categories.

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

5. **Make yourself admin.** Register an account in the app, then in the Supabase
   *SQL Editor* run:

   ```sql
   update public.profiles set role = 'admin' where email = 'your@email.com';
   ```

   After that the *Admin* link appears in the header and you can approve pending
   tenders and businesses.

> Tip: while testing you can turn off the email-confirmation requirement in
> Supabase under *Authentication → Providers → Email → Confirm email*.

## Deploying (Netlify)

1. Push the repo to GitHub.
2. In Netlify: *Add new site → Import an existing project* and pick the repo.
   Netlify detects Next.js automatically (build command `npm run build`) and its
   Next.js runtime handles the server rendering and middleware — no extra config.
3. Under *Site configuration → Environment variables*, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy, then point the materiaalitukku.com domain at the site and set the same URL as
   the Site URL in Supabase (*Authentication → URL Configuration*).

## Not yet ported from the old app

Messaging, subscriptions/pricing, AI features, photo uploads, the full admin suite,
the 30+ machine-translated languages, and the Firestore → Postgres data migration.
Add these incrementally — the schema and RLS policies are designed to grow.
