# 01 — Activity timeline (Contact + Deal)

Status: done

**What to build:** A chronological Activity timeline on both the Contact and Deal detail views: a merged, newest-first feed of a "created" entry, system-generated Deal stage-change entries, and user-authored Comments, with a form to post a new Comment from either view. Deals gain a new read-only detail (`view`) dialog — mirroring the one Contacts already have — since today a deal card opens straight into its edit form. Stage changes (drag-and-drop or edit form) automatically add a timeline entry. The seed script is extended so a freshly-reset demo already shows self-consistent timelines: deals seeded past the "New" stage get a plausible history of prior stage changes, and a handful of contacts/deals get sample Comments.

**Blocked by:** None — can start immediately.

- [x] A `contacts`-and-`deals`-agnostic `activities` data model exists (per ADR `0001-single-polymorphic-activities-table.md`) storing Comments and Deal stage-change events, queryable per entity.
- [x] `activitiesService.list(entityType, entityId)` returns that entity's timeline newest-first, with a synthesized "created" entry (from the entity's own `created_at`) merged in — not stored separately.
- [x] `activitiesService.create(entityType, entityId, body)` posts a Comment, stamped with the current user's email as `author_email` and the current time.
- [x] `dealsService.changeStage` writes a `stage_changed` activity entry (recording from-stage and to-stage) as part of changing a deal's stage — covered whether the change came from drag-and-drop on the pipeline board or from the edit form.
- [x] Clicking a deal card opens a new read-only Deal `view` dialog (matching Contact's existing `view`/`create`/`edit` pattern) showing the deal's details and its Activity timeline, with a path from there into the existing edit dialog.
- [x] The Contact `view` dialog (existing) gains the Activity timeline alongside its current linked-deals/linked-tasks display.
- [x] Both the Contact and Deal views let the logged-in user submit a Comment; blank/whitespace-only submissions are rejected, and comment length is capped at roughly 2000 characters.
- [x] Posted Comments and system entries are display-only afterward — no edit or delete affordance.
- [x] After posting a Comment or changing a deal's stage, the open timeline reflects it immediately without a manual page reload.
- [x] The reseed script regenerates: a plausible, backdated `stage_changed` history for every seeded deal not in its initial ("New") stage, and one or two sample Comments on a handful of seeded contacts and deals — so a freshly-seeded demo never shows an empty or inconsistent timeline.
- [x] Tasks are unaffected — no activity timeline or related UI added to the Tasks section.
- [x] Tests: `activitiesService` integration tests (list ordering incl. synthesized "created" entry, create), an extension to `dealsService.test.ts` asserting `changeStage` produces a `stage_changed` entry, and page-level tests for both `ContactsPage` and `PipelinePage` covering timeline rendering and comment submission via a fake `activitiesService` double — following the existing service-prop-swap pattern.

## Comments

Implemented the `activities` table (migration `create_activities_table`) with a check constraint enforcing the per-type column shape, `activitiesService` (`list`/`create`/`recordStageChange`) with the `buildTimeline` pure merge function unit-tested directly (no DB), `dealsService.update` extended to look up the deal's prior stage and call `recordStageChange` when it differs (covers both drag-and-drop and the edit form, since both ultimately call `update`), and a shared `ActivityTimeline` component plus `useActivityTimeline` hook (the fetch-on-open/prepend-on-post glue) used identically by both `ContactsPage`'s existing `view` dialog and a new `view` dialog added to `PipelinePage`. `scripts/seed.ts` now backdates every non-"New" deal's `created_at` and backfills a staggered `stage_changed` history up to its seeded stage, plus four sample Comments. 85 tests passing (up from 70), typecheck clean, build succeeds.

`/code-review` (Standards + Spec, two parallel subagents) against fixed point `947484e` found:
- **Standards**: the timeline-load-on-open + post-comment glue was duplicated near-verbatim between `ContactsPage` and `PipelinePage`. Fixed by extracting `useActivityTimeline` into `ActivityTimeline.tsx` alongside the component it serves.
- **Spec**: two wording mismatches, both judged as reasonable implementation refinements rather than defects, and updated in the docs rather than the code: (1) `activitiesService.list` takes `entityCreatedAt` as a third argument rather than looking it up itself, so the service doesn't need a dependency on the `contacts`/`deals` tables — both callers already have the full entity loaded when they open the view dialog; (2) the `activities` table uses separate `from_stage`/`to_stage` columns instead of cramming a stage transition into the shared `body` text column. Both the ADR and `spec.md` were updated to describe the actual shape.

Live-verified via `npm run seed` against the production Supabase project: 21 activities seeded (17 stage-changes + 4 comments) with every timestamp landing after its deal's backdated `created_at` and before now, confirmed by direct SQL query.
