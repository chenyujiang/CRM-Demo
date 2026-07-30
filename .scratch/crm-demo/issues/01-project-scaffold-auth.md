# 01 — Project scaffold, Supabase connection, and login

**What to build:** A deployed, working shell of the app: a visitor lands on a login screen, logs in with a Supabase Auth account, and sees an authenticated app shell with navigation to the four core sections (Contacts, Pipeline, Tasks, Dashboard — placeholder content is fine for now). Logging out returns to the login screen, and an unauthenticated visitor is redirected there too. This is the foundation every later ticket builds on, including the data-service seam pattern later tickets will follow.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] App scaffolded with React + TypeScript + Vite; shadcn/ui configured for a clean, generic, professional look (no Acumen branding)
- [x] Supabase project connected (Postgres + Auth) — project `crm-demo` (ap-southeast-2)
- [x] Login screen backed by Supabase Auth; logout available from the authenticated shell
- [x] Unauthenticated access redirects to login; authenticated access shows the app shell with navigation to Contacts / Pipeline / Tasks / Dashboard (placeholder pages)
- [x] App deployed to Vercel and reachable via a shareable URL — https://crm-demo-eason-chen.vercel.app
- [x] Data-service seam established as a pattern (e.g. an example service module + how it's swapped for a test double in UI tests) for later tickets to follow — all Supabase calls go through this seam, never called directly from UI code
- [x] Test proving login/logout works end-to-end through the UI seam

## Comments

- Verified live: real login/logout against the deployed app and a seeded Supabase Auth demo account (`demo@crm-demo.test`), plus direct-navigation to a deep link (`/login`) after adding a `vercel.json` SPA rewrite (Vercel 404s client-side routes without it).
- `/code-review` (Standards + Spec) run against this ticket; one finding (dangling `seed` script/`tsx` dep with no `scripts/seed.ts`) fixed in a follow-up commit. No other issues.
