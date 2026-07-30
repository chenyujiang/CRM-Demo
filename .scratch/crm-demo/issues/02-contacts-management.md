# 02 — Contacts management

**What to build:** The full Contacts section, end to end: a logged-in user can see a list of contacts, search or filter it, open a contact to see its details, create a new contact, edit an existing one, and delete one. The list is pre-seeded with realistic-looking fictional contacts so the screen never looks empty on first login.

**Blocked by:** 01 — Project scaffold, Supabase connection, and login

**Status:** done

- [x] `contacts` table created in Supabase (name, company, email, phone, notes, timestamps)
- [x] Contacts data-service module implements list, create, update, delete, and search/filter — all through the seam established in ticket 01
- [x] Contacts list screen shows all contacts and supports searching/filtering by name or company
- [x] Contact detail view shows name, company, email, phone, and notes
- [x] A contact can be created, edited, and deleted through the UI
- [x] Seed script populates ~15-20 fictional contacts for a generic SaaS-sales-company scenario, and is re-runnable to reset to a known-good state — 18 seeded
- [x] Tests: contacts data-service tests (data-service seam) and contacts screen tests (UI seam, real behaviour with the service swapped for a test double)

## Comments

- Verified live: list, search, create, view-details (incl. notes), edit, delete against the deployed app and seeded Supabase data.
- `/code-review` (Standards + Spec) run twice. First pass found a real spec gap: "open a contact to see its details" had been collapsed into the edit form, with no read-only view and notes never shown outside editing. Fixed with a dedicated read-only detail dialog (commit `0d12691`), re-reviewed, redeployed, and re-verified live. Standards axis findings (minor duplication in session mapping, duplicated demo credentials, borderline Divergent Change in `ContactsPage.tsx`) were judgement calls, left as-is at this scale.
