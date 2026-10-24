# Proposal

## Why

The application has one implicit owner: every stored transaction belongs to the single Easybank Giro account, and neither import path can say whose expenses these are. Importing a second person's statement would mix their transactions into the same undifferentiated ledger, with no way to tell the rows apart or count them per person. This change makes the owner explicit, so a second person's expenses can be imported alongside the first without being confused with them, and adds the small management surface needed to name and count people.

## What Changes

- Introduce a **Person**: a named owner that every transaction references. The reference is required and immutable after import; a person's name is mutable.
- Migrate the existing data by creating a person named `Default` and assigning every existing transaction to it. The migration always creates `Default`, including on an empty database.
- Add a **People** screen and API: list every person with their transaction count, create a person, and rename one. There is no delete and no transaction reassignment.
- Make the person part of the import identity. **BREAKING**: the CSV import requires `--person <name>`, and an unknown person fails before any row is written.
- Give the Easybank sync one configured person, `EASYBANK_PERSON`, defaulting to `Default`. The Giro retrieval and value-date floor are unchanged.
- **BREAKING**: every transaction now requires a person. The transactions read API returns `person`, the table gains a Person column, persons are sortable and filterable, and the search is scoped to the selected person.
- **BREAKING**: the transactions search no longer covers every person unconditionally. A non-empty search ignores category and period but stays within the selected person.
- Add a person filter to the analytics, monthly totals, and monthly average screens. The selection is URL-backed and carried through every drill-down link.
- Record the person on each new import run; legacy runs read as not recorded.
- Add the People route to the navigation and the document title.

## Capabilities

### New Capabilities

- `person-management-api`: the read/write surface for people — listing every person with a transaction count, creating one, renaming one, case-insensitive name identity, and the absence of deletion or transaction reassignment.
- `person-management-screen`: the `/people` browser screen — the list with counts, the create and rename form, the empty and failure states, and the no-delete rule.

### Modified Capabilities

- `transaction-domain-model`: a transaction carries a required person reference as an eighth data element; the owner is distinct from the counterparty; the "no other entity" guarantee is replaced.
- `transaction-postgres-schema`: a `people` table, a required `transactions.person_id` reference, a nullable `import_runs.person_id`, the `Default` seed and backfill, and the person's stable identity and mutable name.
- `transaction-read-api`: the returned transaction carries `person { id, name }` and the endpoint joins the people table.
- `transaction-table`: a Person column, a person filter and query value, person sorting, person-scoped search, and person-scoped category and period options.
- `transaction-csv-import`: a required run-time person, person identity in deduplication, the person stored on every written row, and the person on the run record.
- `easybank-sync`: `EASYBANK_PERSON`, its `Default` default, and the failure when the configured person does not exist.
- `import-log`: a person on each new run, exposed by `GET /api/imports` and shown on the imports screen; legacy runs carry null.
- `category-spending-chart`: a URL-backed person filter and person-carrying month, year, and slice links.
- `monthly-category-totals-table`: a URL-backed person filter and person-carrying cell links.
- `monthly-category-average`: a URL-backed person filter.
- `category-management-screen`: the shared menu bar gains the People link, aligned with the existing Imports link.
- `frontend-shell`: the `/people` route, its menu link, and its document title.
- `backend-shell`: the `/api/people` surface, the import command's person argument, and the people API as a shared-pool consumer.
- `responsive-frontend`: seven reachable routes, the People screen, the person filter on the transactions screen, and the People table's narrow-width behaviour.

## Impact

- **Database**: a new `db/migrations/0010_people.sql` creating `people`, seeding `Default`, adding `transactions.person_id` with a backfill and `NOT NULL`, and adding nullable `import_runs.person_id`. The migration runner's requirements do not change; the new file is applied as any other migration.
- **Shared import path**: `shared/transactions-import.ts` resolves the person, includes it in the dedupe identity, writes it on every row, and records it on the run. `shared/easybank-sync.ts` passes the configured person. `app/utils/category-spending.ts` gains the person-aware transaction shape and filter.
- **Command line**: `tools/import-transactions.ts` gains a required `--person`; `tools/easybank-sync.ts` reads `EASYBANK_PERSON`. `README.md` and `.env.example` document both.
- **Server**: new `server/api/people/` endpoints; `server/api/transactions.get.ts`, `server/api/imports.get.ts`, and `server/tasks/easybank/sync.ts` change.
- **Browser**: a new `app/pages/people.vue`; `app/layouts/default.vue`, the transactions page, and the three analytics pages change.
- **Tests**: unit, component, integration, and browser coverage for the migration, the person API, the person-scoped import and search, the People screen, and the analytics filter and drill-downs.
- **Breaking**: the domain model, the import command, the transaction's required person, and the search scope. The application is upgraded in place by the migration; existing rows all become `Default`, and existing import commands must add `--person`.
