# 04 — Tasks / follow-ups

**What to build:** The full Tasks section: a logged-in user can see a list of tasks (title, due date, optional linked contact or deal, complete/incomplete state), create a new task and optionally link it to a contact or deal, edit or delete a task, and mark a task complete. Overdue and due-soon tasks are visually called out. The list is pre-seeded with tasks in a mix of states so the section demonstrates urgency handling on first login.

**Blocked by:** 02 — Contacts management, 03 — Sales pipeline (tasks can optionally link to a contact or a deal, so both tables must already exist)

**Status:** ready-for-agent

- [ ] `tasks` table created in Supabase (title, due date, completed flag, optional contact reference, optional deal reference, timestamps)
- [ ] Tasks data-service module implements list, create, update, delete, and mark-complete — all through the data-service seam
- [ ] Tasks list screen shows title, due date, optional linked contact/deal, and complete/incomplete state
- [ ] A task can be created (optionally linked to a contact or deal), edited, and deleted through the UI
- [ ] A task can be marked complete
- [ ] Overdue and due-soon tasks are visually distinguished from other tasks
- [ ] Seed script populates a mix of overdue, due-soon, future, and completed tasks, and is re-runnable
- [ ] Tests: tasks data-service tests and tasks screen UI tests
