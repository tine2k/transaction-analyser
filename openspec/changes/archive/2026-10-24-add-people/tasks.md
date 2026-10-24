# Tasks

## 1. Schema and migration

- [x] 1.1 Add `db/migrations/0010_people.sql`: create `people` (identity id, non-null name), a unique index on `lower(name)`, insert `Default`, add nullable `transactions.person_id`, backfill every transaction to `Default`, set `person_id` non-null, add nullable `import_runs.person_id`, add an index on `transactions(person_id)`, and document the rollback. Verify by applying it to a disposable database with a pre-seeded transaction and confirming `Default` exists, every row references it, `person_id` is non-null, and `import_runs.person_id` is nullable.
- [x] 1.2 Update `tests/run-with-test-database.sh` to require `people` and `person_id` in its readiness check, and update `tests/fixtures/integration.sql` to create the fixture transactions with `person_id` and to add a second person for person-scoped tests. Verify the launcher reaches the fixture and the existing integration suites start against it.
- [x] 1.3 Add a migration regression test in `tests/integration/` that applies migrations through `0009`, seeds a transaction, applies `0010`, and asserts `Default`, the backfilled reference, the non-null constraint, the case-insensitive name index, and null legacy `import_runs.person_id`. Verify the new test passes against a disposable PostgreSQL database.
- [x] 1.4 Document the upgrade behaviour in `README.md`: existing transactions become `Default`, `Default` also exists on a fresh database, and it can be renamed. Verify the documented steps match the migration and name no manual SQL.

## 2. Shared import path and commands

- [x] 2.1 Add person resolution to `shared/transactions-import.ts`: trim the name, look it up with `lower(name)`, fail when it does not exist, include `personId` in the dedupe query and fingerprint, write `person_id` on every inserted row, and set the person on `startImportRun`. Verify new unit tests cover per-person dedupe, an existing person resolved from different case, an unknown person, and a dry run.
- [x] 2.2 Update `tools/import-transactions.ts` to require `--person`, resolve it before writing, print the person in its report, and exit non-zero on an unknown person; update its usage text. Verify with a dry run against the disposable database, plus the existing import unit tests.
- [x] 2.3 Update `shared/easybank-sync.ts`, `tools/easybank-sync.ts`, and `server/tasks/easybank/sync.ts` to read `EASYBANK_PERSON`, default it to `Default`, resolve it, pass it to the shared import, and record a failed run when it cannot be resolved. Verify unit and integration tests cover the default, a configured person, an unknown person, and the manual and screen-started paths.
- [x] 2.4 Add `EASYBANK_PERSON` to `.env.example` and update the `README.md` import and sync sections with `--person`, `EASYBANK_PERSON`, and the rename warning. Verify the documented commands and variable names match the code.
- [x] 2.5 Extend `tests/unit/transactions-import.test.ts`, `tests/unit/easybank-sync.test.ts`, `tests/integration/transactions-import.test.ts`, and `tests/integration/easybank-sync.test.ts` with two-person dedupe, unknown-person, and rename-failure cases. Verify `npm run test:unit` and the relevant integration tests pass.

## 3. Backend APIs

- [x] 3.1 Add `server/utils/people.ts` and the routes `server/api/people/index.get.ts`, `server/api/people/index.post.ts`, and `server/api/people/[id].put.ts`: list with `transactionCount`, create, rename, trim, case-insensitive uniqueness, `400`/`404`/`409`/`500` mapping, fixed failure messages, and no delete route. Verify unit and integration tests cover list ordering, zero counts, create, duplicate, empty name, rename, unknown id, and the absence of deletion.
- [x] 3.2 Update `server/api/transactions.get.ts` to join `people` and return a required `person: { id, name }` on every transaction. Verify the read-API integration test asserts the person field, its exact fields, and that a rename changes the returned name.
- [x] 3.3 Update `server/api/imports.get.ts` to join `people` and return `person: { id, name } | null`. Verify the import-log integration test covers a new run with a person, a legacy run with null, and a rename changing the displayed name.
- [x] 3.4 Update any API fixtures or test helpers that construct transaction or import-run responses. Verify the integration suite builds and passes against the disposable database.

## 4. Transactions screen

- [x] 4.1 Update `app/pages/index.vue`: add `person` to the transaction type, render the Person column, add person sorting, add the `person` filter and query value, derive person choices from the response, scope period choices/defaults and category choices/defaults/counts to the selected person, scope the search and change its label and paused note, preserve the person query through sort/search changes, clear the selection on person changes, and include person in the row memo and refresh reconciliation. Verify the existing component and browser suites still pass and new assertions cover the person column, filter, sort, scoped search, and URL reload.
- [x] 4.2 Update `tests/components/transactions.test.ts` and the affected `tests/browser/` specs with person fixtures and person-scoped cases. Verify `npm run test:components` and `npm run test:browser` pass.
- [x] 4.3 Update the transactions screen's responsive test expectations for the extra column and filter. Verify the 320-pixel browser check passes without page-level horizontal overflow.

## 5. Analytics screens

- [x] 5.1 Add the person field and a person filter helper to `app/utils/category-spending.ts`. Verify `tests/unit/category-spending.test.ts` covers selecting one person and all people.
- [x] 5.2 Update `app/pages/analytics.vue`, `app/pages/monthly-totals.vue`, and `app/pages/monthly-average.vue` with the URL-backed person select, choices derived from the response, filtering before the existing derivations, and person-carrying chart, slice, and cell links. Verify component tests cover the select, URL reload, filtering, and drill-down links.
- [x] 5.3 Update `tests/components/analytics.test.ts`, `tests/components/monthly-totals.test.ts`, `tests/components/monthly-average.test.ts`, and `tests/unit/category-spending.test.ts` with person cases. Verify `npm run test:unit` and `npm run test:components` pass.
- [x] 5.4 Update the analytics description in `README.md` with the person filter. Verify the documented behaviour matches the page.

## 6. People screen and navigation

- [x] 6.1 Add `app/pages/people.vue` using `GET /api/people`, a shared create/edit name form, a list of name and transaction count, create and rename writes, no delete control, and the loading, empty, failure, and refused-write states. Verify component tests cover the list, zero count, create, rename, cancel, duplicate, failure, and the absence of deletion.
- [x] 6.2 Add the People entry to `app/layouts/default.vue` so the menu bar links to `/people` and the document title reads `People · Expenses`. Verify the layout and document-title tests pass.
- [x] 6.3 Add `tests/components/people.test.ts` and `tests/browser/people.spec.ts` for the screen's create, rename, no-delete, count, empty, failure, and narrow-width behaviour. Verify `npm run test:components` and `npm run test:browser` pass.
- [x] 6.4 Add the People screen and the person filter to the relevant `README.md` "What it does" section. Verify the described screens are reachable from the menu bar.

## 7. Integration verification

- [x] 7.1 Run `npm run test:unit` and confirm the import, person, migration, and analytics unit tests pass.
- [x] 7.2 Run `npm run test:components` and confirm the transactions, people, layout, analytics, monthly totals, and monthly average component tests pass.
- [x] 7.3 Run `npm run test:integration` against the disposable PostgreSQL database and confirm the migration, API, import, sync, and import-log integration suites pass.
- [x] 7.4 Run `npm run test:browser` with headless Chromium and confirm the transactions, people, document-title, and responsive checks pass.
- [x] 7.5 On a fresh database, confirm `Default` exists with zero transactions and an import with `--person Default` lands. On a populated database, confirm the migration backfills `Default`, a second person imports without cross-person deduplication, the transactions search stays within the selected person, an analytics drill-down carries the person, the import log names it, and renaming `Default` makes an unconfigured sync fail loudly.
- [x] 7.6 Run `openspec validate add-people --strict` and confirm it reports the change as valid.

## Workflow follow-up

- Archive the change once review is complete; the archive command commits and pushes according to `AGENTS.md`.
- Verify the archived specs and change history after archiving.
