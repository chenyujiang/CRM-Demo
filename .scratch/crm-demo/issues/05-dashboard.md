# 05 — Dashboard

**What to build:** The full Dashboard section: a logged-in user sees a handful of key metrics (open deals count, total pipeline value, deals won this period, open task count) and at least one chart (e.g. pipeline value by stage, or deals won over time), all computed live from the real seeded deals and tasks data rather than hardcoded.

**Blocked by:** 03 — Sales pipeline, 04 — Tasks / follow-ups (metrics are aggregated from deals and tasks data)

**Status:** ready-for-agent

- [ ] Dashboard aggregation logic computes the four key metrics from the deals and tasks data-services (no duplicated data access — reuses the existing seams)
- [ ] Dashboard screen displays the four key metrics
- [ ] At least one chart is rendered from real aggregated data
- [ ] Dashboard reflects the current state of the data (changing an underlying deal or task changes what the dashboard shows)
- [ ] Tests: dashboard aggregation tests (data-service seam) and dashboard screen UI test
