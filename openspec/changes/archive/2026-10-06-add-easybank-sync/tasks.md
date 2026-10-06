# Tasks

## 1. Bank Access Spike

- [x] 1.1 Write a throwaway headless-Chromium spike (Playwright is already a devDependency) that logs in to `ebanking.easybank.at` with the real credentials, opens the Giro account's transaction list, and reads two pages — verified against the real account: the login, the list, and paging all complete with no app confirmation, the table carries booking date, booking text, value date, and amount, and no SCA overlay appears; the captured HTML was kept for the parser tests
- [x] 1.2 Record the shipped access mechanism: plain HTTP against the transaction list, no browser, no SCA-gated action, with the booking-text mapping — verified by updating `design.md` D1, D13, R1, R7, and O1/O2 with the captured flow and the observed SCA behavior (the CSV export and the search panel demand app confirmation; the list does not)

## 2. Import Run Records

- [x] 2.1 Create `db/migrations/0006_import_runs.sql` with an identity primary key, `started_at timestamptz NOT NULL`, `finished_at timestamptz`, `source text NOT NULL`, `non_writing boolean NOT NULL`, `outcome text NOT NULL`, `rows_read integer NOT NULL`, `rows_already_stored integer NOT NULL`, `rows_written integer NOT NULL`, `error text`, and an index on `started_at DESC` — verify by applying it to a disposable database with `psql` and confirming the columns, constraints, and index, per design.md D11
- [x] 2.2 Add `server/api/imports.get.ts` returning the 50 most recent runs newest first as JSON through the shared pool — verify with an integration test against a disposable database seeded with more than 50 runs, confirming the order, the bound, and that no run is altered by the request, per the `import-log` capability and design.md D8
- [x] 2.3 Extend the integration test to confirm the endpoint answers with an empty list when no run exists and that a request using another method alters no record, per the `backend-shell` and `import-log` capabilities

## 3. Shared Import Module and Dedupe

- [x] 3.1 Extract the CSV reading, parsing, and row validation from `tools/import-transactions.ts` into a framework-free module under `shared/` that takes a `pg` client or pool and a CSV source (path, string, or stream) — verify the existing unit and integration tests for the importer still pass when the CLI is pointed at the module, per design.md D5
- [x] 3.2 Implement the dedupe rule in the module: fingerprint each row on booking date, value date, amount (compared numerically), purpose, counterparty name, and counterparty account; count the stored matches and the matches already accepted in the run; write only the surplus — verify with unit tests for a first import writing every row, a repeat import writing none, a file holding a duplicate twice writing two, a file holding one more than the table writing one, and a stored row left unchanged, per the modified `transaction-csv-import` capability and design.md D6
- [x] 3.3 Implement the run record in the module: insert the row at start (start time, source, non-writing, in progress), update it at the end with finish time, outcome, counts, and error — verify with an integration test against a disposable database for a successful run, a non-writing run, and a failed run, and for a run left in progress when the process is interrupted, per the `import-log` capability and design.md D7
- [x] 3.4 Keep validation-first and all-or-nothing behavior with dedupe: validate every row before opening the write transaction, and roll back every written row on failure — verify with integration tests for a file holding one invalid row (nothing written, every invalid row reported) and for a forced failure part-way through the writes (no row remains), per the modified `transaction-csv-import` capability
- [x] 3.5 Add `importRows` to the shared module so a caller that already holds validated rows (the Easybank sync) goes through the same classification, write transaction, and run-record path as the CSV import — verify with an integration test importing mapped rows directly and confirming the same dedupe and counts as the CSV path, per the `easybank-sync` capability and design.md D5

## 4. Manual Importer on the Shared Path

- [x] 4.1 Refactor `tools/import-transactions.ts` to call the shared module while keeping its argument interface (`<file.csv>`, `--dsn`, `--dry-run`) and its redaction of credentials — verify by running it against a disposable database: a first run writes and records a manual run, a second run reports every row as already stored and writes nothing, and `--dry-run` reports new versus already stored and writes nothing, per the modified `transaction-csv-import` capability and design.md D5, D7
- [x] 4.2 Update the README's import section to state that a repeated import skips stored rows and that the non-writing mode reads the database to classify rows — verify the documented commands run as written against a disposable database, per the modified `transaction-csv-import` capability

## 5. Imports Screen

- [x] 5.1 Add `app/pages/imports.vue` requesting `GET /api/imports` on mount and rendering one row per run with time, source, non-writing marker, outcome, read / already stored / written counts, and failure reason, with defined empty and error states — verify with component tests covering several runs, an empty list, a failed request, and a non-writing run, per the `import-log` capability and design.md D9
- [x] 5.2 Add the `/imports` entry to the layout's screen navigation — verify with a headless-Chromium browser test that the menu reaches `/imports` and the screen renders a seeded run, per the modified `frontend-shell` capability

## 6. Easybank Fetch and Sync Command

- [x] 6.1 Implement the login-and-list step behind one seam: add `cheerio` as the one new dependency; read `EASYBANK_USER` and `EASYBANK_PIN`; log in over plain HTTP with a cookie jar; select the Giro account; page through the transaction list until the window is covered; and map each row's booking text to booking date, value date, amount, counterparty name, counterparty account, and purpose — verify with unit tests against a fake bank server serving canned pages, including a rejected login, a page without the list, and every mapping case (IBAN, no IBAN, single line, IBAN on the first line, IBAN with nothing after it), per the `easybank-sync` capability and design.md D1, D3, D4, D12, D13
- [x] 6.2 Add `tools/easybank-sync.ts` running the same sync by hand with `--from`/`--to`, `--dsn` or `DATABASE_URL`, and `--dry-run`/`--write`, reading the same environment credentials and redacting them — verify by running it against a fake bank and a disposable database: a non-writing run records a non-writing run and writes nothing; with writing enabled it imports the new rows and records a writing run; a repeated run imports nothing, per the `easybank-sync` capability and design.md D10
- [x] 6.3 Implement the sync's failure handling so that a login, retrieval, or import failure records a failed run with a redacted reason and writes no transaction, and so that absent credentials record no run at all — verify with unit and integration tests against fakes and a disposable database for each failure and for the unconfigured case, per the `easybank-sync` capability
- [x] 6.4 Apply the sync's value-date floor of 2026-09-20: exclude every retrieved row whose value date is on or before it before the rows reach the shared import path, and leave the run's counts to the rows that passed — verify with unit tests for the boundary (2026-09-19 and 2026-09-20 excluded, 2026-09-21 imported, a later booking date with an earlier value date excluded) and an integration test that an excluded row is neither written nor counted, per the `easybank-sync` capability and design.md D14; note the floor in the README's sync section

## 7. Nightly Task and Configuration

- [x] 7.1 Add `server/tasks/easybank/sync.ts` calling the same sync through the shared pool, so the task, the command, and the manual import share one import path — verify by invoking the task in a test or dev run against a fake bank and a disposable database and confirming it records a run and skips stored rows, per the `easybank-sync` and `backend-shell` capabilities and design.md D2, D5
- [x] 7.2 Configure `nitro.experimental.tasks: true` and `nitro.scheduledTasks: { '0 3 * * *': ['easybank:sync'] }` in `nuxt.config.ts`, and set `TZ=Europe/Vienna` in the Dockerfile — verify the configuration is present, that the built server starts, and that the task is invocable by name, per design.md D2
- [x] 7.3 Add `EASYBANK_USER`, `EASYBANK_PIN`, and `EASYBANK_SYNC_WRITE` with empty values to `.env.example`, and document in the README the environment, the non-writing default, how to enable writing, and the window and backfill limits — verify the example holds no real value, the documented commands are accurate, and the README's migration step mentions `0006_import_runs.sql`, per the `easybank-sync` capability and design.md D4, R5

## 8. Integration and Deployment Checks

- [x] 8.1 Run the full automated suite (`npm test`) against a disposable database with a fake bank, confirming the unit, component, integration, and browser suites pass together, per AGENTS.md's database-test rules
- [x] 8.2 Run an end-to-end dry run: a disposable database, the fake bank, the manual sync command with `--dry-run`, then the task by name, and confirm the counts on `GET /api/imports` and on `/imports` match what the fake export holds, per the `easybank-sync` and `import-log` capabilities
- [x] 8.3 Build the application (`npm run build`) and start the built output against a disposable database, confirming the server serves `/api/health`, `/api/imports`, and `/imports`, and that starting it changes no schema and no data, per the modified `backend-shell` capability and design.md D11

## Workflow follow-up

- Review the change and, once satisfied, archive it with the project's archive workflow.
- Verify the archived result updates `transaction-csv-import`, `backend-shell`, and `frontend-shell`, and creates `easybank-sync` and `import-log` in the main specs.
