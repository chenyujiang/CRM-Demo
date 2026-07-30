# 03 — Sales pipeline (deals kanban)

**What to build:** The full Pipeline section: a kanban board with one column per deal stage. Each deal is a card showing its name, associated contact, value, and stage. A user can drag a card between columns to change its stage, create a new deal and assign it to a contact and stage, edit an existing deal's details, and mark a deal won/lost or delete it. The board is pre-seeded with deals spread across stages so it looks like an active pipeline on first login.

**Blocked by:** 02 — Contacts management (deals reference contacts)

**Status:** done

- [x] `deals` table created in Supabase (name, value, stage, contact reference, won/lost status, timestamps) — won/lost implemented as two of the six stage values, not a separate field (see Comments)
- [x] Deals data-service module implements list, create, update, delete, and change-stage — all through the data-service seam
- [x] Pipeline board UI: one column per stage, deal cards show name / contact / value / stage
- [x] Dragging a card to another column updates its stage
- [x] A deal can be created (assigned to a contact and stage) and edited through the UI
- [x] A deal can be marked won/lost or deleted — by dragging into or selecting the Won/Lost stage; no separate "mark won" button
- [x] Seed script populates 8-10 deals spread across pipeline stages, linked to seeded contacts, and is re-runnable — 9 seeded
- [x] Tests: deals data-service tests (including stage-change behaviour) and pipeline board UI tests, including the outcome of a drag-and-drop action

## Comments

- Verified live: real mouse drag persisted a stage change to the database; editing a deal's Stage via the dialog select also persisted; both reverted back to the clean seeded state afterward.
- Drag-and-drop outcome is tested via a pure `handleDealDrop(event, deals)` function extracted from the dnd-kit wiring, rather than simulating dnd-kit's pointer/keyboard gesture mechanics in jsdom — that keeps the test fast and deterministic while trusting dnd-kit's own test suite for the gesture layer itself. Also added a keyboard sensor (`columnKeyboardCoordinateGetter`) so the board is drag-operable via keyboard, not just mouse.
- Design note: "won"/"lost" are two of the six values in the single `stage` column (not a separate status field layered on top of a funnel stage). This means moving a deal to Won/Lost overwrites which funnel stage it was in — there's no record of "closed from Negotiation" vs "closed from New". `/code-review`'s spec axis flagged this as worth confirming rather than assuming; judged it acceptable because (a) "one column per deal stage" reads naturally as stage *being* the six-column set, and (b) the dashboard ticket's metrics (open deal count, pipeline value, deals won this period, open task count) don't need prior-stage history. Revisit if a later requirement needs it.
- `/code-review` also caught: cards weren't rendering their stage as text (only implied by column) — fixed by adding a stage label per card; and a confusing near-dead-code fallback in the keyboard coordinate getter — simplified.
