# 06 — Demo polish: toasts, contact detail enrichment, search

**What to build:** Three small, high-visibility improvements identified after the initial five tickets shipped, aimed at making the demo read as a complete product rather than a set of independent screens:

1. **Toast notifications** — a lightweight, app-wide toast surfaces success/error feedback for create, update, and delete actions across Contacts, Pipeline, and Tasks, instead of those actions completing silently.
2. **Contact detail enrichment** — a contact's detail view shows the deals and tasks linked to that contact, so a contact reads as a hub rather than an isolated record.
3. **Pipeline and Tasks search** — both screens gain a search input (matching deal/contact name on Pipeline; title/contact/deal name on Tasks), mirroring the search Contacts already has.

**Blocked by:** None — can start immediately (all five original tickets are done).

**Status:** ready-for-agent

- [ ] A toast appears on successful create/update/delete on Contacts, Pipeline, and Tasks, and on delete failure; auto-dismisses after a few seconds
- [ ] A contact's detail dialog lists its linked deals (name + stage) and tasks (title + due date), or a clear empty state for each
- [ ] Pipeline has a search input that filters visible deal cards by deal name or contact name
- [ ] Tasks has a search input that filters visible tasks by title, contact name, or deal name
- [ ] Tests: pure filter-function tests for the two search behaviours, a toast-context test (show + auto-dismiss + variant), and UI tests for the contact detail enrichment
