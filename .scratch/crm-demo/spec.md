# CRM Demo

Status: ready-for-agent

## Problem Statement

There's no working example to show a customer or internal stakeholder what a CRM built for their workflow could look like. Describing a CRM in words, or showing generic screenshots from an existing product, doesn't land the same way as a working, clickable demo that presents core CRM workflows (managing contacts, tracking deals through a pipeline, following up on tasks, seeing progress on a dashboard) with realistic-looking data.

## Solution

Build a small, full-stack CRM demo application: a real login, a handful of core CRM screens backed by a real database, and pre-seeded realistic-looking data, so it can be opened and clicked through live in a demo setting. It targets proof-of-concept fidelity, not production-grade completeness — the goal is to convincingly demonstrate the core workflows, not to cover every feature a real CRM would eventually need.

## User Stories

1. As a demo viewer, I want to log in with a provided account, so that I see the app the way a real user would, not an open/public page.
2. As a demo viewer, I want to log out, so that the session can be handed to someone else or reset.
3. As a demo viewer, I want to see a list of contacts, so that I can see how customer records are organized.
4. As a demo viewer, I want to see a contact's name, company, email, phone, and any notes on a contact detail view, so that I can judge whether the record is useful.
5. As a demo viewer, I want to create a new contact, so that I can see the CRM handle new data, not just pre-seeded data.
6. As a demo viewer, I want to edit an existing contact's details, so that I can see records can be kept up to date.
7. As a demo viewer, I want to delete a contact, so that I can see incorrect or unwanted records can be removed.
8. As a demo viewer, I want to search or filter the contacts list (e.g. by name or company), so that I can find a record quickly in a longer list.
9. As a demo viewer, I want to see a sales pipeline as a kanban board with columns per stage, so that I can see deals move through a sales process visually.
10. As a demo viewer, I want to see each deal as a card showing its name, associated contact, value, and stage, so that I can judge the state of the pipeline at a glance.
11. As a demo viewer, I want to drag a deal card between stage columns, so that I can see the pipeline update in response to a real sales action.
12. As a demo viewer, I want to create a new deal and assign it to a contact and a stage, so that I can see new opportunities enter the pipeline.
13. As a demo viewer, I want to edit a deal's details (name, value, associated contact, stage), so that I can see deal records can be corrected without dragging.
14. As a demo viewer, I want to delete or mark a deal as won/lost, so that I can see deals leave the active pipeline.
15. As a demo viewer, I want to see a list of tasks (follow-ups), so that I can see how the CRM tracks upcoming work.
16. As a demo viewer, I want each task to show a title, due date, and (optionally) a linked contact or deal, so that I can see tasks connect to the rest of the CRM.
17. As a demo viewer, I want to create a new task, so that I can see follow-up work being captured.
18. As a demo viewer, I want to mark a task as complete, so that I can see the CRM track what's been actioned.
19. As a demo viewer, I want to edit or delete a task, so that I can see task records stay accurate.
20. As a demo viewer, I want to see tasks that are overdue or due soon called out, so that I can judge how the CRM surfaces urgency.
21. As a demo viewer, I want to see a dashboard with a handful of key metrics (e.g. total open deals, total pipeline value, deals won this period, open task count), so that I can judge the CRM's reporting at a glance.
22. As a demo viewer, I want at least one chart on the dashboard (e.g. pipeline value by stage, or deals won over time), so that I can see the CRM presents data visually, not just as numbers.
23. As a demo viewer, I want the app to look clean and professional on first load — not empty — so that the demo lands well without needing manual data entry first.
24. As a demo viewer, I want the app to be usable on a laptop browser window at typical demo resolutions, so that it presents well when screen-shared or projected.
25. As a maintainer, I want the demo data to be re-seedable, so that the database can be reset to a known-good state between demo sessions.

This list covers the demo's functional surface area exhaustively; it does not include stories for out-of-scope work (see below).

## Implementation Decisions

- **Stack**: React + TypeScript, built with Vite. Supabase provides Postgres (data), and Supabase Auth (login/session) — no separate backend service is built; the frontend talks to Supabase directly through the data-service seam described below.
- **UI components**: shadcn/ui (Tailwind-based) for a clean, professional, generic look — no custom branding, no Acumen visual identity.
- **Deployment**: Vercel, so the demo is reachable via a shareable URL.
- **Data model** (Postgres tables, exact columns to be finalized during implementation):
  - `contacts` — name, company, email, phone, notes, timestamps
  - `deals` — name, value, stage, contact reference, timestamps, won/lost flag or status
  - `tasks` — title, due date, completed flag, optional contact/deal reference, timestamps
  - Auth/users are handled by Supabase Auth directly; no custom roles or permission tables.
- **Data-service seam**: all Supabase reads/writes are wrapped in per-entity service modules (e.g. a contacts service, a deals service, a tasks service). Application/UI code calls these services, never the Supabase client directly. This is the single seam business logic (e.g. "what happens when a deal moves stage") is tested through.
- **UI seam**: each core screen (contacts list/detail, pipeline board, tasks list, dashboard) is treated as one testable unit, exercised through user-visible behavior (render output, clicks, drag-and-drop outcome) with the data-service layer swapped for a test double. Sub-components within a screen are not individually seamed.
- **Pipeline drag-and-drop**: implemented with a standard React drag-and-drop library (exact choice left to implementation) rather than hand-rolled — this is a well-understood pattern and doesn't need a research or prototype detour.
- **Seed data**: a fictional SaaS/software-sales company, ~15-20 contacts and 8-10 deals spread across pipeline stages, plus a handful of tasks in varying due/overdue states, loaded via a re-runnable seed script (not committed as production migrations data).
- **Language**: all code, UI copy, and repo content is written in English.

## Testing Decisions

- Tests target external behavior only — what a user sees or does — never internal implementation details (e.g. don't assert on internal component state or which sub-component rendered).
- **Data-service layer**: unit/integration tests per service module (contacts, deals, tasks), covering the business-relevant behavior (e.g. moving a deal to "won" sets the right status) against a Supabase test project or local Supabase instance — not against a hand-mocked client.
- **Page-level UI**: one test suite per core screen (contacts, pipeline board, tasks, dashboard) using Testing Library, rendering the real screen with the data-service layer swapped for a test double, asserting on rendered output and behavior after interaction (e.g. dragging a card, submitting a form).
- No end-to-end (browser-automation) test suite for this demo scope — the two seams above give sufficient coverage for a proof-of-concept without the maintenance cost of full E2E.
- No prior art in this repo (greenfield) — first tests in each seam set the pattern for the ones that follow.

## Out of Scope

- Email or calendar integration
- Marketing automation
- Support/ticketing functionality
- Multi-tenant or multi-organization support
- Complex role-based permissions or audit logging
- Real third-party data import/export or external API integrations
- A dedicated mobile app (a responsive web layout is sufficient; no native app)
- Acumen Consulting branding/visual identity

## Further Notes

- Audience/purpose: this is a proof-of-concept demo for showing to external clients or internal stakeholders — not a production system. Fidelity should target "looks and works convincingly," not completeness or production hardening (no need for rate limiting, advanced security hardening, observability, etc.).
- The app should never be shown empty on first login — seeded data must be present before any demo.
