# 04 — Tasks / follow-ups

**What to build:** The full Tasks section: a logged-in user can see a list of tasks (title, due date, optional linked contact or deal, complete/incomplete state), create a new task and optionally link it to a contact or deal, edit or delete a task, and mark a task complete. Overdue and due-soon tasks are visually called out. The list is pre-seeded with tasks in a mix of states so the section demonstrates urgency handling on first login.

**Blocked by:** 02 — Contacts management, 03 — Sales pipeline (tasks can optionally link to a contact or a deal, so both tables must already exist)

**Status:** done

- [x] `tasks` table created in Supabase (title, due date, completed flag, optional contact reference, optional deal reference, timestamps) — contact_id/deal_id are ON DELETE SET NULL so a task survives if its link is removed
- [x] Tasks data-service module implements list, create, update, delete, and mark-complete — all through the data-service seam
- [x] Tasks list screen shows title, due date, optional linked contact/deal, and complete/incomplete state — an explicit checkbox, not just implied by strikethrough
- [x] A task can be created (optionally linked to a contact or deal), edited, and deleted through the UI
- [x] A task can be marked complete
- [x] Overdue and due-soon tasks are visually distinguished from other tasks
- [x] Seed script populates a mix of overdue, due-soon, future, and completed tasks, and is re-runnable — 10 seeded
- [x] Tests: tasks data-service tests and tasks screen UI tests

## Comments

- Caught and fixed a real timezone bug during implementation: the default due-date shown when opening "Add task" used `toISOString()` (UTC), which rolls back to the wrong calendar day in timezones ahead of UTC. Fixed with a local-date helper before this ever shipped, and re-verified live in the browser (correct Jul 30, 2026 "today" boundary for overdue/due-soon).
- `/code-review` (Standards + Spec) run. Spec axis was clean — no gaps this time (mark-complete is its own service method, not folded into generic update; complete/incomplete is a real checkbox). Standards axis caught real Duplicated Code: the local-date formatter was written twice (`TasksPage.tsx` and `scripts/seed.ts`) — extracted to `src/lib/date.ts`, shared by both, re-verified live and via a fresh `npm run seed` run. Also improved the completion checkbox's `aria-label` from just the title to "Mark X complete" per a minor accessibility nit.
