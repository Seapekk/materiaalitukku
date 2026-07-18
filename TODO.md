# Materiaalitukku rebuild — To-do list

## 1. Get it running (do this first, ~10 min)
- [ ] Create a free Supabase project at supabase.com
- [ ] Run `supabase/migrations/001_init.sql` in the Supabase SQL Editor
- [ ] Run `supabase/seed.sql` (category tree)
- [ ] Copy Project URL + anon key into `.env.local` (see `.env.example`)
- [ ] `npm run dev`, create your admin user (Supabase → Authentication → Add user, auto-confirm)
- [ ] Make yourself admin:
      `update public.profiles set role = 'admin' where email = 'seapekk1@gmail.com';`
- [ ] Test the whole loop: submit a product at `/submit` → approve it in `/admin` →
      see it with its price in `/products`

## 2. Before going live
- [ ] Push to GitHub (private repo; local git is already set up on branch `main`)
- [ ] Deploy to Netlify (import repo from GitHub, set the two `NEXT_PUBLIC_SUPABASE_*`
      env vars under Site configuration → Environment variables)
- [ ] Point the materiaalitukku.com domain at the new Netlify site
- [ ] In Supabase: Authentication → URL Configuration → set Site URL to https://materiaalitukku.com
- [ ] Add privacy policy + legal pages
- [ ] Favicon + og-image
- [ ] robots.txt + sitemap, submit to Google Search Console

## 3. Port features from the old app (in this order)
- [ ] Admin UI for editing products, suppliers, offers, transport companies and
      categories (until then: Supabase dashboard's table editor works)
- [ ] Product images (Supabase Storage; the old app had image + show/hide toggle)
- [ ] Migrate real data out of the old Firestore project (products/titles, suppliers,
      offers, transport companies)
- [ ] Retail price scraping pipeline ("ScrapedPrice": Bauhof, Hornbach, … with
      admin accept/reject) — only if it proved useful in the old app
- [ ] Price staleness dashboard (highlight offers not updated in N days)
- [ ] Email notification to admin when a new submission arrives
- [ ] Supplier self-service accounts (suppliers manage their own offers) — later,
      when there are enough suppliers to justify it

## 4. Housekeeping (once live)
- [ ] Weekly database backup (`pg_dump` or Supabase scheduled backups)
- [ ] Error monitoring (Sentry free tier)
- [ ] Privacy-friendly analytics (Plausible/Umami)
- [ ] Spam protection on `/submit` if bots appear (Cloudflare Turnstile is free)
