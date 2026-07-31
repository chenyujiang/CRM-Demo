# 07 — Sign up, gated by email verification

**What to build:** A public sign-up screen that creates a new Supabase Auth user and, per the project's email-confirmation requirement, does not log the new user in immediately — they must confirm their email via the link Supabase sends before `Log in` will accept their credentials.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A `/signup` route with email/password/confirm-password fields, reachable via a link from the login page (and vice versa)
- [ ] Submitting a valid sign-up form creates the Supabase Auth user and shows a clear "check your email to confirm" state instead of navigating into the app (since no session exists yet)
- [ ] Submitting mismatched passwords shows an inline error and does not call Supabase
- [ ] Logging in with an unconfirmed account surfaces Supabase's "email not confirmed" error inline on the login form (already-existing error-handling path — just needs the account to actually be unconfirmed for this to be reachable)
- [ ] Supabase project's email confirmation requirement is verified enabled, and Auth URL configuration (Site URL / Redirect URLs) points at the deployed production domain so the confirmation link actually works for real users
- [ ] Tests: sign-up flow tests (success/confirmation-pending state, password-mismatch validation, login↔signup cross-navigation) via the existing fake-authService seam pattern
