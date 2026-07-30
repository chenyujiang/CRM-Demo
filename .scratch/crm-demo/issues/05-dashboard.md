# 05 — Dashboard

**What to build:** The full Dashboard section: a logged-in user sees a handful of key metrics (open deals count, total pipeline value, deals won this period, open task count) and at least one chart (e.g. pipeline value by stage, or deals won over time), all computed live from the real seeded deals and tasks data rather than hardcoded.

**Blocked by:** 03 — Sales pipeline, 04 — Tasks / follow-ups (metrics are aggregated from deals and tasks data)

**Status:** done

- [x] Dashboard aggregation logic computes the four key metrics from the deals and tasks data-services (no duplicated data access — reuses the existing seams)
- [x] Dashboard screen displays the four key metrics
- [x] At least one chart is rendered from real aggregated data
- [x] Dashboard reflects the current state of the data (changing an underlying deal or task changes what the dashboard shows)
- [x] Tests: dashboard aggregation tests (data-service seam) and dashboard screen UI test

## Comments

Implemented `computeDashboardMetrics` (pure) plus `dashboardService.getMetrics`, composing the existing `dealsService`/`tasksService` seams rather than owning a data seam of its own (a deliberate divergence from the `defaultXService`-optional-prop pattern, since the dashboard has no table). `DashboardPage` renders four stat tiles and a recharts pipeline-value-by-stage bar chart, styled per the `dataviz` skill.

TDD'd throughout: aggregation logic and UI both red-green. Typecheck clean, full suite (50 tests / 9 files) passing, build succeeds.

`/code-review` (Standards + Spec, two parallel subagents) against fixed point `f305ab2` found one real Standards issue: `DEAL_STAGES`/`stageLabels` were duplicated between `PipelinePage.tsx` and this ticket's `DashboardPage.tsx` (Duplicated Code smell). Fixed by extracting `DEAL_STAGES`/`dealStageLabels` into `dealsService.ts` as the single source of truth and having both pages import from there (commit `44ad4a8`). No Spec-axis findings.

Live-verified in browser on the redeployed production build (https://crm-demo-eason-chen.vercel.app/dashboard): 7 open deals, $114,500 pipeline value, 1 deal won this month, 8 open tasks, all six stage bars rendering with correct labels. Also re-verified `/pipeline` renders the same deduplicated stage labels on its deal cards. This was the final ticket — the CRM demo build is complete.
