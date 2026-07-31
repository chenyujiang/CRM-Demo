# 06 — Demo polish: toasts, contact detail enrichment, search

**What to build:** Three small, high-visibility improvements identified after the initial five tickets shipped, aimed at making the demo read as a complete product rather than a set of independent screens:

1. **Toast notifications** — a lightweight, app-wide toast surfaces success/error feedback for create, update, and delete actions across Contacts, Pipeline, and Tasks, instead of those actions completing silently.
2. **Contact detail enrichment** — a contact's detail view shows the deals and tasks linked to that contact, so a contact reads as a hub rather than an isolated record.
3. **Pipeline and Tasks search** — both screens gain a search input (matching deal/contact name on Pipeline; title/contact/deal name on Tasks), mirroring the search Contacts already has.

**Blocked by:** None — can start immediately (all five original tickets are done).

**Status:** done

- [x] A toast appears on successful create/update/delete on Contacts, Pipeline, and Tasks, and on delete failure; auto-dismisses after a few seconds
- [x] A contact's detail dialog lists its linked deals (name + stage) and tasks (title + due date), or a clear empty state for each
- [x] Pipeline has a search input that filters visible deal cards by deal name or contact name
- [x] Tasks has a search input that filters visible tasks by title, contact name, or deal name
- [x] Tests: pure filter-function tests for the two search behaviours, a toast-context test (show + auto-dismiss + variant), and UI tests for the contact detail enrichment

## Comments

Implemented `ToastContext` (app-wide provider mounted in `App.tsx`), enriched `ContactsPage`'s detail dialog by composing the existing `dealsService`/`tasksService` seams (same `Pick<...,"list">` pattern `DashboardPage` already used), and added `filterDeals`/`filterTasks` pure functions wired to a search `Input` on Pipeline and Tasks. TDD'd throughout — 67 tests passing across 10 files (up from 50), typecheck clean, build succeeds.

`/code-review` (Standards + Spec, two parallel subagents) against fixed point `de792dd` found:
- **Standards**: the delete handler's try/succeed-toast/catch-error-toast shape and the search-filter match shape were each duplicated three times / twice. Fixed by extracting `deleteWithToast` (`ToastContext.tsx`) and `matchesQuery` (`lib/search.ts`) as shared helpers (commit `c2e9140`).
- **Spec**: marking a task complete/incomplete wasn't toasted, though it's an "update" per the spec's toast bullet. Fixed by adding a toast there too, with a new test.
- No scope creep; the "save failures stay inline-only, only delete failures toast" behavior was judged correct as written (matches the ticket's literal wording).

**Deploy note:** this was the first ticket deployed through the newly-connected GitHub → Vercel Git integration (set up earlier this session) rather than the `deploy_to_vercel` MCP tool directly. The Git-triggered build initially crashed at runtime (`Error: supabaseUrl is required`) because `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` had only ever been passed as literal files in prior MCP deploys, never committed to git or configured as real Vercel Environment Variables. Fixed by adding both as Production+Preview environment variables in the Vercel project settings and redeploying — this is a one-time fix that also covers all future git-triggered deploys.

Live-verified on production (https://crm-demo-eason-chen.vercel.app) after the fix: contact detail dialog shows linked deals/tasks correctly, Pipeline and Tasks search both filter correctly, toast-triggering actions (create/delete deal, mark task complete/incomplete) work with no console errors, and Dashboard numbers are unchanged (7 open deals, $114,500 pipeline value, 1 deal won, 8 open tasks). No leftover test data — the throwaway deal created during verification was deleted afterward.
