# Proposal

## Why

Transactions reach the database only when someone exports a CSV from Easybank eBanking and runs the importer by hand. The account should keep itself current: the server should fetch the Easybank Giro account's transactions every night, store only what is new, and show what each import did — while still allowing a non-writing run until the nightly path is trusted.

## What Changes

- Add a nightly sync, scheduled by the running server, that logs in to Easybank eBanking, reads the Giro account's transaction list for a rolling window over plain HTTP, maps each row's booking text to a counterparty and a purpose, and imports it through the existing row validation. It touches no action that needs app confirmation: the bank protects the CSV export and the search panel with strong customer authentication, but the login, the list, and its paging do not.
- Never import a transaction whose value date is on or before 2026-09-20: the sync applies that floor before the shared import path, so a nightly window that reaches back into history cannot duplicate what is already held. The manual CSV import is unaffected.
- Make every import idempotent: a row already stored is skipped rather than imported again, and two genuinely identical rows in one file still produce two transactions by counting the surplus over what the table already holds.
- Record every import run — scheduled or manual, dry or real — in a new `import_runs` table, and expose the recent runs read-only at `GET /api/imports`.
- Add an `/imports` screen that lists the most recent runs with their outcome and counts.
- Add a command that runs the sync by hand, non-writing until writing is enabled, so the login, the retrieval, and the counts can be checked before the nightly run is trusted.
- **BREAKING** for the manual importer's stated contract: a second run of the same file no longer duplicates the statement, and the non-writing mode now reads the database to report which rows are new (it still writes nothing).
- Extract the parse/validate/write logic into one module shared by the manual importer and the sync, so both paths deduplicate and record a run the same way.

## Capabilities

### New Capabilities

- `easybank-sync`: nightly retrieval of the Easybank Giro account's transactions — the bank credentials read from the environment and never disclosed, the one account it covers, the rolling window that also recovers a missed night, the value-date floor below which nothing is imported, the non-writing mode, failure handling, and the manual run of the same sync.
- `import-log`: the record every import run leaves behind — its fields and outcome, the read-only endpoint that returns the most recent runs, and the screen that shows them.

### Modified Capabilities

- `transaction-csv-import`: the requirement that a file is stored exactly as given, rows included, is replaced by "only rows that are not already stored are imported"; the non-writing mode may read the database to classify rows; the success and count rules account for skipped rows.
- `backend-shell`: the API surface gains the read-only import log endpoint; the server holds the bank credentials and runs the scheduled sync; the command-line importer shares its import logic and a sync command joins it, while the existing migrations stay plain SQL files.
- `frontend-shell`: the browser routes gain `/imports`, reached from the menu bar; the shell's no-write guarantee is scoped to the browser, because the scheduled sync is now a writer.

## Impact

- **Spec deltas**: `specs/easybank-sync/spec.md` and `specs/import-log/spec.md` (new), plus deltas for `transaction-csv-import`, `backend-shell`, and `frontend-shell`.
- **Schema**: one new migration creating `import_runs`. The `transactions` table is unchanged.
- **Server**: a Nitro task under `server/tasks/` with a nightly schedule, a read-only `/api/imports` endpoint, and a shared import module used by the task, the manual importer, and the sync command.
- **Frontend**: a new `/imports` page and a menu entry.
- **Tooling**: `tools/import-transactions.ts` is refactored onto the shared module; a new sync command joins it.
- **Configuration**: the application container gains `EASYBANK_USER` and `EASYBANK_PIN` (never printed, never committed) and a switch that keeps the nightly sync non-writing until writing is enabled.
- **Dependencies / image**: the sync reads the bank's transaction list over plain HTTP and parses it with an HTML parser, so no browser runtime enters the image. The spike settled this: the CSV export demands app confirmation, the transaction list does not.
- **Existing data**: the manual importer's behavior changes only for rows already stored; a first import of new data is unchanged.
