# Materiaalitukku rebuild — Recommendations

Lessons from the old AI-Studio codebase, and how to keep this one healthy.

1. **Use git from day one.** The old project had no version control — instead it had
   `restore.cjs`, `comma-fix.cjs`, `fix-template.cjs` and dated zip files. With git,
   every change is reversible and zips become unnecessary. Commit small and often.

2. **Never edit with one-off fix scripts.** If a change is needed, change the source
   file directly (or ask an AI assistant to). Scripts that rewrite your code in bulk
   were the main source of chaos in the old repo.

3. **Launch with 3 languages, not 30.** The old app machine-translated everything into
   30+ languages, which created ~half of its 55k lines and endless "missing key" fix
   scripts, while real visitors were only ever going to come from et/fi/en (+ maybe ru).
   Add a language only when analytics show demand.

4. **Don't build subscriptions/payments yet.** Pricing tiers, revenue models and Stripe
   are only worth it after the marketplace has activity. An empty marketplace with a
   paywall stays empty. Get tenders and businesses on it first; charge later.

5. **Keep moderation manual for now.** The old app had AI moderation pipelines. With
   MVP-level traffic, approving items yourself in `/admin` takes seconds a day and
   teaches you what spam actually looks like before you automate it.

6. **Let the database do the security.** All access rules live in Postgres row-level
   security (`001_init.sql`), not in the UI. When you add features, add a policy for
   them too — never work around RLS by loosening a policy you don't fully understand.

7. **Keep secrets out of git.** `.env.local` is already gitignored — keep it that way.
   The `NEXT_PUBLIC_*` values are safe to expose (they're public by design); anything
   without that prefix (service-role key, SMTP passwords) must never reach the browser
   or the repo.

8. **Run the old and new sites in parallel** until the new one has the core flows plus
   your migrated data, then switch the materiaalitukku.com DNS. Don't delete the old project
   or Firebase data until well after the switch.

9. **Measure before adding.** Before porting each old feature, check whether anyone
   used it. Search Console + a simple analytics tool will tell you which pages and
   languages matter. Most of the old app's ~46 screens likely had zero visitors.

10. **Keep dependencies boring.** The stack (Next.js, Supabase, Tailwind, next-intl)
    covers everything the MVP needs. Resist adding libraries for charts, animation,
    PDF export etc. until a real feature requires them — the old app shipped d3,
    chart.js, jspdf and html2canvas to every visitor.
