# Materiaalitukku rebuild — To-do list

## 1. Get it running (do this first, ~10 min)
- [ ] Create a free Supabase project at supabase.com
- [ ] Run `supabase/migrations/001_init.sql` in the Supabase SQL Editor
- [ ] Run `supabase/seed.sql` (starter categories)
- [ ] Copy Project URL + anon key into `.env.local` (see `.env.example`)
- [ ] `npm run dev`, register an account
- [ ] Make yourself admin:
      `update public.profiles set role = 'admin' where email = 'seapekk1@gmail.com';`
- [ ] Test the whole loop: post a tender → approve it in `/admin` → see it on `/tenders`

## 2. Before going live
- [ ] Put the project in git and push to GitHub (private repo is fine)
- [ ] Deploy to Netlify (import repo from GitHub, set the two `NEXT_PUBLIC_SUPABASE_*`
      env vars under Site configuration → Environment variables)
- [ ] Point the materiaalitukku.com domain at the new Netlify site
- [ ] In Supabase: Authentication → URL Configuration → set Site URL to https://materiaalitukku.com
- [ ] Add privacy policy + cookie/legal pages (can copy the text from the old app)
- [ ] Add favicon and og-image (reuse `public/` assets from the old app zip)
- [ ] robots.txt + sitemap, submit to Google Search Console
- [ ] Register/verify the site in Search Console for et/fi/en URLs

## 3. Port features from the old app (in this order)
- [ ] Edit + close/delete your own tenders and business from the dashboard
- [ ] Photo uploads for tenders and business logos (Supabase Storage, max ~2 MB, resize client-side)
- [ ] Contact-reveal workflow (provider requests contact info, owner or auto mode approves — the old app's `revealedTo` logic)
- [ ] Pagination on tender/business lists (currently capped at 50 newest)
- [ ] Firestore → Postgres migration script for the old app's real data
- [ ] Email notifications (new tender in your category, tender approved/rejected)
- [ ] Messaging between tender owner and providers
- [ ] Admin: category management, user list, ban user
- [ ] More languages (Russian next, only if there's demand)
- [ ] Pricing/subscriptions (only once there are real users — see recommendations)

## 4. Housekeeping (once live)
- [ ] Weekly database backup: Supabase free tier keeps only limited backups — set up a
      scheduled `pg_dump` or use Supabase's scheduled backups when upgrading
- [ ] Error monitoring (Sentry free tier) 
- [ ] Simple privacy-friendly analytics (Plausible/Umami) instead of Google Analytics
- [ ] Spam protection on the tender form if bots appear (Cloudflare Turnstile is free)
