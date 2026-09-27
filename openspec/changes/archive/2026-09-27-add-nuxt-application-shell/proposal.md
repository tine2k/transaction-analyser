# Proposal

## Why

The project has data and no way to look at it. `db/migrations/` creates `transactions` and `categories`, `tools/import-transactions.ts` fills the first of them from a bank export, and three capabilities describe what a row means — but every one of those is a terminal. The only way to see a transaction today is a terminal running a script that writes rows and exits, and the only way to see a category is to read SQL. There is no application, no server, and no user interface, so the analysis the repository is named for cannot start. This change creates the empty application that the later changes fill: a Nuxt application at the repository root, with a Nitro server on one origin, a Vue shell, and a PostgreSQL connection already wired — and deliberately no transaction feature in it.

## What Changes

- Add Nuxt 4 at the repository root, so one package manifest, one dependency tree, and one install cover both the application and the existing CLI. The root `package.json` becomes the Nuxt manifest and keeps its `import` script; `nuxt.config.ts` configures the app, and Nuxt's `app/` and `server/` directories hold the two halves.
- Add a Nitro server that serves the Vue application and its API from a single origin on a single port in server-rendered mode. There is no separate frontend package, no proxy, and no cross-origin configuration.
- Add exactly one backend endpoint, `GET /api/health`, which reports that the server is up. No endpoint reads or writes `transactions` or `categories`, and no endpoint accepts a method that creates, alters, or deletes, so nothing in this change can alter the user's financial data.
- Wire the database without using it: `DATABASE_URL` is read from the environment into Nitro runtime config, a single shared `pg` pool is created lazily on first use, and no query is written against it. The server starts and serves the health endpoint with no database reachable and opens no connection at boot, so a missing or stopped PostgreSQL is not a reason the shell fails to run.
- Add a Vue application shell: a default layout wrapping every route, an index route that renders placeholder text, and an error page for failed requests and unknown routes. No page lists, filters, edits, or reports transactions.
- Add Tailwind CSS 4 for styling, wired through its Vite plugin, with no component library and no design system — the stylesheet is the entry point the first real screen builds on.
- Keep `tools/import-transactions.ts` exactly as it is. It remains a standalone Node CLI run by `npm run import`, and `db/migrations/*.sql` remain plain SQL applied with `psql -f`. Neither is moved, rewritten, wrapped, or reached from the application.
- Add no authentication, no test runner, no linter, no CI, no ORM, no migration tool, and no container or deployment configuration. Everything here is scaffolding, and there is nothing yet to test or lint.
- Deliberately not included: any read or write of transaction data, any application of category patterns, any way to trigger an import from the browser, any account or session concept, and any deployment story beyond running the server locally. Each of those is a change of its own.

## Capabilities

### New Capabilities

- `backend-shell`: the server half of the application — that the client and the API are served from one origin by one process, that the API surface is a single health endpoint with no data access, that the database address and its credentials come from the environment and never from the repository or a response body, that a shared connection pool exists but is opened only on first use, and that the existing CLI and the SQL migrations keep working unchanged alongside it.
- `frontend-shell`: the client half of the application — that every route renders inside one default layout, that the only route is an index route holding placeholder text, that failures render a defined error page rather than a blank screen, that styling arrives through a Tailwind stylesheet with no component library, and that the browser is never given a database address and reaches data only through the same-origin API.

### Modified Capabilities

None. All three existing capabilities are read and conformed to, not changed.

- `transaction-csv-import` is unaffected because its contract is about a file and a run: the import source is still a path given at run time, a dry run still contacts no database, the address and credentials still come from the run's arguments or the environment, and the tool is still not reachable from the application. This change adds no import path, and the file stays outside the repository as that spec requires.
- `transaction-postgres-schema` is unaffected because this change adds no migration, no table, no column, no constraint, and no generated data. Its requirement that the schema consist of exactly two tables is untouched, and the pool introduced here holds no statement of its own until a later change writes one.
- `transaction-domain-model` is unaffected because the application never materialises a `Transaction`, a `Category`, or any domain value. The shell's only domain-adjacent act is holding a connection to the database those aggregates are stored in.

## Impact

- **Spec deltas**: `specs/backend-shell/spec.md` and `specs/frontend-shell/spec.md` in this change, two new capabilities with no `MODIFIED` sections.
- **New files**: `nuxt.config.ts`, `app/app.vue`, `app/layouts/default.vue`, `app/pages/index.vue`, `app/error.vue`, `app/assets/css/main.css`, `server/api/health.get.ts`, `server/plugins/database.ts`, `server/utils/db.ts`, and `.env.example`. Nuxt's own scaffold also generates `.nuxt/` at install time.
- **Changed files**: `package.json` gains the `nuxt`, `tailwindcss`, and `@tailwindcss/vite` dev dependencies and the `dev`, `build`, `preview`, and `postinstall` scripts, while keeping `import` and the existing runtime dependencies unchanged. `.gitignore` gains `.nuxt/`, `.output/`, and the environment files. `tsconfig.json` becomes the project-references root Nuxt documents.
- **Dependencies**: `nuxt` 4.5.2, `tailwindcss` 4, `@tailwindcss/vite` 4. `csv-parse` and `pg` stay as they are; `pg` gains a second caller rather than a new role.
- **Schema**: none. No migration is added and neither existing migration is edited. The database is reached with the same `DATABASE_URL` the importer already uses, and applying the schema remains `psql -f db/migrations/0001_transactions.sql` then `0002_transaction_categories.sql`.
- **Existing data**: none. No query is written and none runs, so no row is read, written, or altered. The pool exists but stays closed until a future change runs a statement through it.
- **Unchanged and required to stay so**: `tools/import-transactions.ts`, its `transaction-csv-import` spec, both SQL migrations, and the `db/migrations/` layout. A follow-up change may build on this one; this one may not quietly absorb theirs.
- **Downstream**: every later change — applying category patterns, listing transactions, reporting, editing a category — lands in the `server/` and `app/` directories created here and inherits the decisions this change fixes: one origin, runtime config for the database address, a shared lazy pool, no ORM, and an unauthenticated local application.
- **Open questions deferred**: the pin policy for the Nuxt version, what the health endpoint reports once a database check is meaningful, whether an import is ever triggerable from the browser, how the application is protected if it is ever hosted anywhere but the developer's own machine, and whether the design tokens arrive with the first real screen. These are recorded in design.md.
