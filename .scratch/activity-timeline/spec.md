# Activity Timeline

Status: ready-for-agent

## Problem Statement

Opening a Contact or Deal in the demo only ever shows its current, static fields — there's no sense that anything has happened to the record over time. A real CRM's value comes partly from that history (notes from calls, a deal's progress through the pipeline), and without it, contact and deal detail views read as flat records rather than something that's actually been used.

## Solution

Add a chronological **Activity** timeline to both the Contact and Deal detail views: a single merged feed of user-authored **Comments** and system-generated events (record creation, and — for Deals — stage changes), newest first, so opening any contact or deal tells the story of what's happened to it, not just its current snapshot.

## User Stories

1. As a demo viewer, I want to open a contact's detail view and see a chronological activity timeline, so that I can see the record has a history, not just static fields.
2. As a demo viewer, I want to open a deal via a new read-only detail view (separate from its edit form) and see its activity timeline, so that I can see how the deal has progressed.
3. As a demo viewer, I want a deal's timeline to gain an entry every time it moves to a new stage — whether by drag-and-drop on the pipeline board or by editing the deal's stage in its form — so that I can see the sales process happening over time.
4. As a demo viewer, I want each stage-change entry to show which stage the deal moved from and to, so that I can follow its path through the pipeline.
5. As a demo viewer, I want every timeline (contact and deal) to include a "created" entry marking when the record was first added, so that the history has a clear starting point.
6. As a demo viewer, I want to add a free-text comment to a contact's timeline, so that I can capture context (e.g. from a call) at the point it happened.
7. As a demo viewer, I want to add a free-text comment to a deal's timeline, so that I can capture sales-relevant context as it happens.
8. As a demo viewer, I want each comment to show who wrote it and when, so that I can tell who said what, and when, in the record's history.
9. As a demo viewer, I want comment authorship to reflect the account I'm actually logged in as, so that the timeline reflects real usage rather than a hardcoded name.
10. As a demo viewer, I want to be prevented from submitting a blank comment, so that the timeline doesn't fill with empty entries.
11. As a demo viewer, I want a reasonable limit on comment length, so that one long entry can't break the timeline's layout.
12. As a demo viewer, I want the timeline to be append-only — no editing or deleting a posted comment — so that it reliably reflects what actually happened, in order.
13. As a demo viewer, I want the timeline sorted newest-first, so that the most recent activity is visible without scrolling.
14. As a demo viewer, I want the deal detail view reachable by clicking a deal card, with a clear path from there into editing, so that viewing and editing a deal follows the same pattern already established for contacts.
15. As a demo viewer, I want a deal's timeline to reflect a stage change or a new comment immediately within the same session, so that the timeline never looks stale while I'm using the app.
16. As a demo viewer, I want a freshly-seeded demo to show contacts and deals that already have timeline entries, so that the feature looks used from first login, not empty.
17. As a demo viewer, I want a deal seeded into a later pipeline stage to show a plausible history of prior stage changes on its timeline, so that its current stage doesn't look inconsistent with an empty or contradictory history.
18. As a maintainer, I want the reseed script to regenerate this seeded activity history along with the rest of the demo data, so that the database can be reset to a known-good, self-consistent state.
19. As a demo viewer, I want Tasks to remain unaffected by this feature — no activity timeline there — so that the change stays scoped to Contacts and Deals.

## Implementation Decisions

- **Domain language**: this feature introduces **Activity** (a single timeline entry — system event or Comment) and **Comment** (a user-authored Activity) as canonical terms; see `CONTEXT.md`. A Comment is distinct from a Contact's existing `notes` field, which remains unchanged (a single, overwritable free-text field, not an append-only log).
- **Data model**: one shared, polymorphic `activities` table — `entity_type` (`contact` | `deal`), `entity_id`, `type` (`comment` | `stage_changed`), `created_at`, plus per-type columns enforced by a check constraint: `body`/`author_email` for a Comment (a text snapshot of the posting user's email at write time, not a foreign key into `auth.users`), `from_stage`/`to_stage` for a stage change. See ADR `0001-single-polymorphic-activities-table.md` for the rationale over separate per-type tables. The "created" entry is not stored — it's synthesized at read/render time from the entity's own `created_at` and merged into the sorted timeline.
- **New service module**: `activitiesService`, matching the existing per-entity service shape (thin wrapper over Supabase) — `list(entityType, entityId, entityCreatedAt)` returning entries sorted newest-first (merging in the synthesized "created" entry built from the caller-supplied `entityCreatedAt`, since the service has no reason to own a dependency on the `contacts`/`deals` tables just to look it up), and `create(entityType, entityId, body)` for posting a Comment.
- **Deal stage-change logging**: `dealsService.changeStage` (existing method) is extended to also call `activitiesService.create` with a `stage_changed` entry recording the from/to stage, so the "moving a deal logs an activity" rule lives in the data-service layer, not the UI.
- **New Deal detail view**: `PipelinePage` gains a `view` dialog mode (mirroring `ContactsPage`'s existing `view`/`create`/`edit` `DialogState` pattern) — clicking a deal card opens this read-only view first, with a button into the existing edit dialog. The timeline and comment form live in this view.
- **Contact detail view**: the existing `view` dialog in `ContactsPage` gains the timeline and comment form, composed alongside the deal/task lists it already shows (ticket 06).
- **Service prop wiring**: both `ContactsPage` and `PipelinePage` accept an optional `activitiesService` prop (`Pick<typeof defaultActivitiesService, "list" | "create">`), following the exact pattern `ContactsPage` already uses for its `dealsService`/`tasksService` props — defaulting to the real service, swappable for a fake in tests.
- **Comment input**: plain text only (no markdown/rich text/@mentions), required (rejects blank/whitespace-only submissions), capped at roughly 2000 characters.
- **Mutability**: Comments are append-only — no edit or delete affordance, for either Comments or system-generated entries.
- **Seed data**: the seed script is extended to (a) generate a plausible `stage_changed` history for every seeded deal not in its initial stage — a sequence of transitions from `new` up to its current stage, with backdated, staggered timestamps — and (b) attach one or two sample Comments to a handful of contacts and deals.

## Testing Decisions

- Tests target external behavior only, per the project's existing testing principle — what a user sees or does, never internal component state.
- **`activitiesService`**: integration tests against the Supabase test project, following the existing pattern in `contactsService.test.ts`/`dealsService.test.ts` — covering `list`'s newest-first ordering (including the synthesized "created" entry) and `create`.
- **`dealsService.changeStage`**: extend `dealsService.test.ts` to assert that changing a deal's stage also produces a corresponding `stage_changed` activity entry — this is the business rule under test, not a UI concern.
- **Page-level UI**: extend `ContactsPage.test.tsx` and `PipelinePage.test.tsx` with the timeline rendering and comment-submission flow, using a fake `activitiesService` double, following the existing service-prop-swap pattern used throughout both files.
- Prior art: `ContactsPage.tsx`'s existing composition of `dealsService`/`tasksService` (ticket 06) is the direct template for how `activitiesService` gets threaded through both pages.

## Out of Scope

- Editing or deleting a posted Comment
- Rich text, markdown, attachments, or @mentions in Comments
- Notifications or alerts tied to new activity
- Real-time/live sync of the timeline across multiple simultaneous viewers
- An activity timeline on Tasks
- Any system-generated Activity type for Contacts beyond "created" (e.g. field-change tracking)
- Role-based permissions on who can comment (any logged-in demo viewer can comment on anything, consistent with the rest of the app's lack of RBAC)

## Further Notes

- This is the next ticket after `07-signup`; the demo's core spec (`../crm-demo/spec.md`) is otherwise fully delivered.
- Domain terms (`Activity`, `Comment`) are recorded in `CONTEXT.md`; the shared-table decision is recorded in `docs/adr/0001-single-polymorphic-activities-table.md`.
- Scoped as a single ticket (both Contact and Deal timelines together) rather than split, since both share the same `activitiesService`/`activities` table and timeline-rendering approach — splitting would add context-switching cost without enabling any parallel work.
