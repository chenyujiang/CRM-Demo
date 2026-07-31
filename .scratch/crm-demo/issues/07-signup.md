# 07 — Sign up, gated by email verification

**What to build:** A public sign-up screen that creates a new Supabase Auth user and, per the project's email-confirmation requirement, does not log the new user in immediately — they must confirm their email via the link Supabase sends before `Log in` will accept their credentials.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A `/signup` route with email/password/confirm-password fields, reachable via a link from the login page (and vice versa)
- [x] Submitting a valid sign-up form creates the Supabase Auth user and shows a clear "check your email to confirm" state instead of navigating into the app (since no session exists yet)
- [x] Submitting mismatched passwords shows an inline error and does not call Supabase
- [x] Logging in with an unconfirmed account surfaces Supabase's "email not confirmed" error inline on the login form (already-existing error-handling path — just needs the account to actually be unconfirmed for this to be reachable)
- [x] Supabase project's email confirmation requirement is verified enabled, and Auth URL configuration (Site URL / Redirect URLs) points at the deployed production domain so the confirmation link actually works for real users
- [x] Tests: sign-up flow tests (success/confirmation-pending state, password-mismatch validation, login↔signup cross-navigation) via the existing fake-authService seam pattern

## Comments

Implemented `authService.signUp` (wraps `supabase.auth.signUp`, returns `null` when no session comes back — i.e. confirmation required) and `AuthContext.signUp` (mirrors `signIn`'s pattern, returns a boolean for "logged in immediately?"). New `SignUpPage` mirrors `LoginPage`'s structure with an added confirm-password field and a "check your email" success state. Both pages cross-link to each other; `AppRoutes` gained the `/signup` route. TDD'd via a new "sign-up flow" describe block in `AppRoutes.test.tsx`, reusing the existing fake-authService/renderApp helpers — 70 tests passing across 10 files (up from 67), typecheck clean, build succeeds.

Also checked the Supabase project's Auth settings directly (dashboard, not a code change so it has no git footprint): "Confirm email" was already enabled by default, but **Site URL was still the `http://localhost:3000` default with zero Redirect URLs configured** — any real confirmation link would have redirected to a dead local address. Fixed by setting Site URL to the production domain and adding `https://crm-demo-eason-chen.vercel.app/**` and `https://crm-demo-*.vercel.app/**` (covers preview/alias domains) to the Redirect URLs allow-list.

`/code-review` (Standards + Spec, two parallel subagents) against fixed point `c487b75` found one real Standards issue: `LoginPage`/`SignUpPage` duplicated the entire centered-card shell verbatim, and `SignUpPage` repeated it a second time internally for its two branches. Fixed by extracting `src/components/AuthCard.tsx` (commit `7a75460`). The Spec axis's "missing" finding on the Supabase config item was a false positive — it was done via the dashboard, just invisible in a git diff.

Live-verified the full gate on production end-to-end: signed up a real test account (`crm-demo-signup-verify-test@acumenonline.co.nz`) → got the "check your email" state → confirmed via SQL that `auth.users` had `email_confirmed_at = null` → attempted login → got "Email not confirmed" inline → confirmed the account via SQL (mirroring how the demo account itself was created) → logged in successfully and landed in the app. Test account deleted afterward (`auth.identities` + `auth.users` rows), no leftover data.
