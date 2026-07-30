# CRM Demo

A proof-of-concept CRM built to demonstrate a modern web app stack to clients and internal stakeholders. Covers contacts, a drag-and-drop sales pipeline, task follow-ups, and a metrics dashboard.

**Live demo:** https://crm-demo-eason-chen.vercel.app
**Login:** `demo@crm-demo.test` / `Demo12345!`

## Features

- **Contacts** — search, view, create, edit, and delete contacts
- **Pipeline** — a kanban board of deals across six stages (New → Qualified → Proposal → Negotiation → Won/Lost), with drag-and-drop (mouse and keyboard) to change stage
- **Tasks** — follow-ups optionally linked to a contact or deal, with overdue/due-soon highlighting and complete/incomplete toggling
- **Dashboard** — open deals, pipeline value, deals won this month, open task count, and a pipeline-value-by-stage chart, all computed live from the underlying data

## Tech stack

- React 19 + TypeScript + Vite
- [shadcn/ui](https://ui.shadcn.com/) (Tailwind CSS) for components
- [Supabase](https://supabase.com/) (Postgres + Auth) for data and authentication
- [@dnd-kit](https://dndkit.com/) for the pipeline's drag-and-drop
- [Recharts](https://recharts.org/) for the dashboard chart
- [Vitest](https://vitest.dev/) + Testing Library for tests
- Deployed on [Vercel](https://vercel.com/)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL and anon key
npm run dev
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Typecheck and build for production |
| `npm run typecheck` | Typecheck only |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run seed` | Reset and reseed the database with demo data (requires `.env`) |

## Architecture

Each entity (contacts, deals, tasks, auth) has a dedicated `src/services/*Service.ts` module that wraps all Supabase access behind a small set of functions (`list`/`create`/`update`/`remove`, plus entity-specific operations). Page components accept an optional service prop that defaults to the real implementation, which lets UI tests inject a fake service instead of mocking Supabase directly.

Business logic that doesn't need a live database — task urgency, drag-drop outcome, dashboard aggregation — is extracted into small pure functions and unit tested directly.

## Project history

This project was planned and built end-to-end following the [mattpocock-skills](https://github.com/mattpocock) workflow (wayfinder → spec → tickets → implement → code-review). The spec and per-ticket breakdown live under `.scratch/crm-demo/`.