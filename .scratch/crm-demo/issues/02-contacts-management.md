# 02 — Contacts management

**What to build:** The full Contacts section, end to end: a logged-in user can see a list of contacts, search or filter it, open a contact to see its details, create a new contact, edit an existing one, and delete one. The list is pre-seeded with realistic-looking fictional contacts so the screen never looks empty on first login.

**Blocked by:** 01 — Project scaffold, Supabase connection, and login

**Status:** ready-for-agent

- [ ] `contacts` table created in Supabase (name, company, email, phone, notes, timestamps)
- [ ] Contacts data-service module implements list, create, update, delete, and search/filter — all through the seam established in ticket 01
- [ ] Contacts list screen shows all contacts and supports searching/filtering by name or company
- [ ] Contact detail view shows name, company, email, phone, and notes
- [ ] A contact can be created, edited, and deleted through the UI
- [ ] Seed script populates ~15-20 fictional contacts for a generic SaaS-sales-company scenario, and is re-runnable to reset to a known-good state
- [ ] Tests: contacts data-service tests (data-service seam) and contacts screen tests (UI seam, real behaviour with the service swapped for a test double)
