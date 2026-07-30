# 03 — Sales pipeline (deals kanban)

**What to build:** The full Pipeline section: a kanban board with one column per deal stage. Each deal is a card showing its name, associated contact, value, and stage. A user can drag a card between columns to change its stage, create a new deal and assign it to a contact and stage, edit an existing deal's details, and mark a deal won/lost or delete it. The board is pre-seeded with deals spread across stages so it looks like an active pipeline on first login.

**Blocked by:** 02 — Contacts management (deals reference contacts)

**Status:** ready-for-agent

- [ ] `deals` table created in Supabase (name, value, stage, contact reference, won/lost status, timestamps)
- [ ] Deals data-service module implements list, create, update, delete, and change-stage — all through the data-service seam
- [ ] Pipeline board UI: one column per stage, deal cards show name / contact / value / stage
- [ ] Dragging a card to another column updates its stage
- [ ] A deal can be created (assigned to a contact and stage) and edited through the UI
- [ ] A deal can be marked won/lost or deleted
- [ ] Seed script populates 8-10 deals spread across pipeline stages, linked to seeded contacts, and is re-runnable
- [ ] Tests: deals data-service tests (including stage-change behaviour) and pipeline board UI tests, including the outcome of a drag-and-drop action
