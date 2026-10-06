# Design

## Context

See proposal.md — Why. The state that shapes this design:

- The application is one Nuxt 4 / Nitro server (SSR off) serving the browser application and the API on one port, with PostgreSQL as an external service. The runtime image is `node:24-bookworm-slim` and holds no browser.
- `tools/import-transactions.ts` is a standalone script run by Node 24's type stripping. It reads a CSV path, validates every row, writes in one transaction, and deliberately has no dedupe. `transaction-csv-import` fixes the file shape and mapping; `backend-shell` currently says the tool is untouched and that no import is reachable from the browser.
- The schema is plain numbered SQL migrations applied by hand. `transactions` has no natural key, no account column, and no bank-supplied identifier, which is why dedupe has to be content-based.
- The bundled Nitro is 2.13.4. It supports scheduled tasks behind `experimental.tasks`: task files under `server/tasks/`, a cron-to-task map at `nitro.scheduledTasks`, `runTask` from server code, and a built-in guard that refuses a second concurrent run of the same task.
- Easybank's live login page still offers the disposer+PIN login (the 2018 LUA's fields survive as `lof5`/`lof9`), but now carries a `grr` token and a session-specific form action, and offers an app-confirmation flow. MoneyMoney, the LUA's host, now reaches easybank over PSD2, so the LUA is a reference rather than a maintained path.
- AGENTS.md requires headless Chromium for browser-based tests and verifications, and a disposable database for PostgreSQL-backed tests.

## Goals / Non-Goals

**Goals:**

- One import path — parse, validate, dedupe, write, record — shared by the manual CSV import, the nightly sync, and the manual sync command.
- A nightly run scheduled by the server itself, with a window wide enough that a missed night recovers on the next run.
- Keep the runtime image slim if the bank can be reached over plain HTTP.
- Non-writing until writing is enabled, and every run visible on `/imports`.

**Non-Goals:**

- No PSD2 or aggregator integration, no browser-triggered import, no authentication.
- No credit-card account, no backfill beyond the bank's search window in the nightly path.
- No retention policy for the run records, no multi-instance coordination, no change to the `transactions` table.

## Decisions

### D1 — Plain HTTP against the transaction list, with no browser and no SCA

The spike (task 1) settled the mechanism against the real account. The login with Verfügernummer and PIN, the finance overview, the Giro account's transaction list, and its paging all work headlessly and without any app confirmation. The CSV export and the transaction search panel are the SCA-gated actions: both open the klar-signing overlay and wait for a confirmation in the easybank app, so an unattended run cannot use them. The shipped sync therefore drives the same flow the 2018 LUA did — login, then the account's transaction list, page by page — over plain `fetch` with a small cookie jar and `cheerio` for the HTML. No browser enters the image.

*Rationale:* the transaction list already carries everything the domain needs except the counterparty, which the booking text supplies (D13), and it is the only route the bank leaves open to an unattended client. Keeping the browser out keeps the nightly run cheap and the image slim, and `cheerio` is the smallest thing that parses the table reliably.

*Alternative considered:* the CSV export — the file with separate `Name` and `Account` columns, but gated behind app confirmation. *Alternative considered:* ship Playwright and click the list — no cookie or form handling, but hundreds of megabytes in the image and a browser process every night for a table that is server-rendered HTML. *Alternative considered:* a PSD2 aggregator — SCA once per ~90 days and fully unattended, but a new external dependency and consent lifecycle, deliberately a separate change. *Alternative considered:* a hand-rolled table parser — one fewer dependency, but entities, nested tags, and multi-line cells are exactly where hand-rolled parsing goes wrong.

### D2 — The nightly run is a Nitro task scheduled by `nitro.scheduledTasks`

`server/tasks/easybank/sync.ts` defines the task. `nuxt.config.ts` sets `nitro.experimental.tasks: true` and `nitro.scheduledTasks: { '0 3 * * *': ['easybank:sync'] }`. The container sets `TZ=Europe/Vienna`. Nitro's runner already refuses to start a task that is still running, so no custom lock is added. There is no startup catch-up: the rolling window (D3) recovers a missed night on the next run, which also keeps `backend-shell`'s "starting the application changes no schema and no data" true.

*Rationale:* the user asked the backend to schedule the run, and Nitro's own mechanism is the least machinery that does it, with the concurrency guard included. A fixed cron means changing the time needs a rebuild, which is acceptable for a self-hosted app.

*Alternative considered:* a `setInterval` in a Nitro plugin — runtime-configurable but reimplements scheduling, timezone handling, and overlap protection. *Alternative considered:* host cron or a systemd timer — the project's previous stance, but it is not "scheduled by the backend". *Alternative considered:* a separate worker container — more moving parts for one nightly job.

### D3 — The retrieval window is the current and preceding calendar quarter

The nightly sync fetches the Giro account's transactions for the current and previous calendar quarter, the widest range the bank's transaction search offers. The manual sync command takes `--from` and `--to` so an older backfill can reach further back using the bank's full transaction list, which is kept for 36 months.

*Rationale:* one login and a few pages per night is trivial, and a window this wide means a run missed for any reason is picked up by the next run. The window is also the bank's own search limit, so it needs no invention.

*Alternative considered:* a fixed 90 days — nearly the same, less aligned with the bank's own boundary. *Alternative considered:* "since the last successful run" — fails exactly when a run is missed.

### D4 — Credentials and the writing switch are environment configuration

The sync reads `EASYBANK_USER` and `EASYBANK_PIN` from the environment at run time. Writing stays off unless `EASYBANK_SYNC_WRITE` is set to a truthy value, so the first nights are non-writing until the user enables writes. Missing credentials mean the task does nothing and records no run — an unconfigured state, not a nightly failure. No credential appears in output, a log line, or a run record; error messages are redacted the way `tools/import-transactions.ts` already redacts a DSN.

*Rationale:* this follows the existing environment discipline (`DATABASE_URL`, `.env.example` with empty values) and the user's request to stay non-writing until the path is trusted.

*Alternative considered:* a committed config file — forbidden by `backend-shell`'s no-secrets rule. *Alternative considered:* writing enabled by default — contradicts the user's stated caution.

### D5 — One framework-free import module in `shared/` takes a client and a source

The parse/validate/dedupe/write logic is extracted from `tools/import-transactions.ts` into a module under `shared/` (Nuxt 4's shared directory) that takes a `pg` client or pool, a CSV source (a path, string, or stream), and a mode, and returns the counts after writing the run record. The manual CLI keeps its argument interface and passes its own client; the nightly task passes the shared pool; the sync command passes its own client.

*Rationale:* the module must be importable both by the Nitro server and by a plain `node tools/...` script, and it must not depend on Nuxt auto-imports or on server-only conventions. `shared/` is the one directory both builds see. One implementation means the dedupe rules cannot drift between the manual and nightly paths.

*Alternative considered:* duplicate the logic in the server — drift and two places to fix. *Alternative considered:* subprocess the CLI from the server — no shared pool, awkward error reporting, and a temp file. *Alternative considered:* put it under `server/utils` — ties the standalone CLI to server conventions.

### D6 — Dedupe counts the surplus of identical rows

A row's fingerprint is its booking date, value date, amount, purpose, counterparty name, and counterparty account. For each distinct fingerprint in the fetched export, the module reads how many matching rows the table already holds (the amount compared numerically) and how many identical rows the run has already accepted, then writes only the difference, all inside the single import transaction. This preserves a legitimate same-day duplicate — the file states it twice and the table ends with two — while a repeat run of the same rows writes nothing. No schema change and no natural key are needed.

*Trade-off accepted:* the bank's `Category` and `Bank` columns are discarded, so two rows differing only in those fields count as the same transaction, and a bank edit to a booked row appears as a new row.

*Alternative considered:* set-existence dedupe — silently drops a legitimate duplicate, the exact failure the current spec was written to avoid. *Alternative considered:* a unique index over the six fields — rejects legitimate duplicates outright. *Alternative considered:* an import ledger keyed by file hash — does not help when consecutive nightly windows overlap.

### D7 — A run record is inserted at start and updated at the end

The `import_runs` row is inserted when the run starts, carrying the start time, the source, and whether the run is non-writing, and it is updated at the end with the finish time, the outcome, the counts, and the failure reason. A process killed mid-run leaves a record reading as in progress, which the screen shows; the next run supersedes it. The record write is separate from the import transaction, so a non-writing run and a failed import are still recorded.

*Rationale:* the log is the trust mechanism for an unattended job; a run that crashes silently would defeat it. Writing once at the end would leave a killed run invisible.

*Alternative considered:* write only at the end — a crash leaves no trace. *Alternative considered:* write inside the import transaction — a non-writing run has no transaction, and a rollback would erase the failure record.

### D8 — The import log endpoint returns a bounded, newest-first list

`GET /api/imports` returns the 50 most recent runs, newest first, read-only, with no pagination or filtering. The table gains an index on the start time for the ordering.

*Rationale:* one run a night plus manual runs is a handful of rows a month; a bounded list keeps the response small without inventing a paging UI.

*Alternative considered:* an unbounded list — grows forever. *Alternative considered:* pagination — not needed at this cadence.

### D9 — The imports screen follows the existing screen conventions

`/imports` requests `/api/imports` on mount and renders a table of runs (time, source, mode, outcome, read / already stored / written counts, reason), with defined empty and error states, styled with the existing utility classes. The layout's screen list gains the entry.

*Rationale:* every existing screen follows this shape; there is nothing new to decide.

*Alternative considered:* a chart — the log is tabular data, and the shell's no-domain-work rule keeps aggregation out.

### D10 — The sync command runs the same module with its own connection

`tools/easybank-sync.ts` runs the same sync by hand, taking `--from`/`--to`, `--dsn` or `DATABASE_URL`, and `--dry-run`/`--write`, reading the same environment credentials. It is the testing path before the nightly run is trusted, and the vehicle the spike grows into.

*Rationale:* the user wants to check the login, the retrieval, and the counts before trusting a nightly write; a command is the only way to do that without adding a browser-triggered import, which `backend-shell` forbids.

*Alternative considered:* an API trigger — unauthenticated and against the no-browser-import stance. *Alternative considered:* wait for the next night — poor feedback while developing.

### D11 — The migration adds only `import_runs`

`db/migrations/0006_import_runs.sql` creates the table: an identity primary key, `started_at timestamptz NOT NULL`, `finished_at timestamptz`, `source text NOT NULL`, `non_writing boolean NOT NULL`, `outcome text NOT NULL`, `rows_read integer NOT NULL`, `rows_already_stored integer NOT NULL`, `rows_written integer NOT NULL`, `error text`, and an index on `started_at DESC`. `transactions` is untouched. The file is applied by hand like every other migration; the application applies nothing at startup.

*Rationale:* the run log is operational data, not part of the `Transaction` aggregate, so it gets its own table and no change to the domain schema.

*Alternative considered:* a JSON log file — not queryable by the API, and lost with the container. *Alternative considered:* columns on `transactions` — conflates the domain with operational history.

### D12 — The bank fetch is one seam, and the bank itself is not in automated tests

The login-and-retrieve step is a single function behind an interface that tests replace with a fake returning a canned CSV. Unit tests cover parsing, validation, dedupe counting, and run recording; integration tests cover the shared import path and the run record against a disposable database; component tests cover the imports screen; the browser suite covers the new route. The real bank is exercised only by the spike and by the manual command, never by the automated suite.

*Rationale:* the bank cannot be a test dependency — it needs real credentials, is nondeterministic, and may require a human — so the testable behavior stops at the seam. This also matches AGENTS.md's disposable-database and headless-Chromium rules.

### D13 — The booking text maps to the counterparty and the purpose, and always produces both

The list has no separate counterparty columns, so the sync reads each row's booking text and maps it:

- A line holding an IBAN: the account is that IBAN; the name is the text after the IBAN on that line plus any later lines; the purpose is the lines before it, or the whole text when the IBAN sits on the first line.
- No IBAN: the name is the first line; the purpose is the later lines, or the first line again when there are none.
- An IBAN with nothing after it: the name is the whole booking text.

Both the name and the purpose are therefore always non-empty, so the domain's required counterparty name is never relaxed.

*Rationale:* this is how the bank's own export separates the same text — the first line names a card payment, and the IBAN's tail names a transfer — and it is what the LUA's open parsing pull request proposes for transfers. Keeping the name required means no domain, schema, API, or table change is needed.

*Trade-off accepted:* for a card row the name is the transaction type (`Bezahlung Karte MC/...`), not the merchant, which stays in the purpose; and a card row's purpose is the whole booking text, so category expressions see the first line too.

*Alternative considered:* the LUA master's mapping — the whole text as the purpose and no name — rejected because the domain requires a name. *Alternative considered:* the IBAN-only mapping on every row — rejected because card rows, the majority, would lose their name.

### D14 — The sync stops at a value-date floor of 2026-09-20

The sync excludes every retrieved row whose value date is on or before 2026-09-20 before the rows reach the shared import path, and the excluded rows are not counted among the rows read, the rows already stored, or the rows written. The floor is by value date, not by booking date, and it applies to the nightly run and the manual command alike.

*Rationale:* the CSV export and the HTML mapping describe a transfer differently, so content-based dedupe cannot match a transfer already imported from a CSV (R7). A floor just after the imported history makes the overlap impossible rather than merely visible, without changing the import path's rules.

*Trade-off accepted:* the date is fixed in the spec and the code, so moving it later needs a change; and a genuinely new transaction whose value date falls on or before the floor — a late-posted settlement, say — is not imported by the sync and must arrive through the manual CSV import.

*Alternative considered:* the shared import path — rejected because it would also stop the manual CSV import from bringing in an older statement. *Alternative considered:* a configurable floor — deferred; a fixed cutover date is what the history needs and can be changed later by a change of this capability.

## Risks / Trade-offs

- **R1 — Easybank may demand app confirmation or SCA for a read-only run.** → The spike showed the login and the transaction list need none, while the CSV export and the search panel do; the sync touches neither. If the bank later gates the list too, the run fails loudly and the PSD2 route is a separate change.
- **R2 — The bank changes its page or its download.** → The fetch is isolated behind one function; a changed page fails the run loudly rather than importing wrong data, and the failure is visible on `/imports`.
- **R3 — Bank credentials live in the application container.** → Environment only, never logged or recorded, writing off until trusted; the app is self-hosted and unauthenticated, and the credentials never reach the browser.
- **R4 — Dedupe treats field-identical rows as the same transaction and cannot see a bank edit.** → The surplus rule preserves legitimate duplicates; an edited row appears as an extra row and the run log makes it visible for a human to remove.
- **R5 — The nightly window is bounded by the bank's search.** → A gap longer than two quarters needs the manual command with `--from` using the bank's 36-month list; documented in the README.
- **R6 — In-process scheduling runs once per server process.** → The project deploys one container; Nitro already guards concurrent runs of one task within a process; a second instance is out of scope and noted.
- **R7 — Rows already imported from the CSV can describe the same transfer differently.** For a card row the CSV and the HTML mapping agree (first line as the name, the rest as the purpose), so dedupe matches. For a transfer the CSV's own derivation of `Name` and `Account` is unverified, because obtaining a CSV sample needs app confirmation, so a first sync over the CSV window can add a second copy of those rows. → Mitigation: D14's value-date floor keeps the sync out of the CSV-imported history entirely, so the mismatch cannot produce a duplicate; above the floor the non-writing run still reports already-stored versus new rows on `/imports` before writing is enabled.
- **R8 — The non-writing default could be left on and the account never updates.** → The run record and the screen mark non-writing runs, so a forgotten switch is visible rather than silent.

## Migration Plan

1. Apply `db/migrations/0006_import_runs.sql` by hand, as with every migration.
2. Deploy with `EASYBANK_USER` and `EASYBANK_PIN` set and `EASYBANK_SYNC_WRITE` unset. The first nightly run is non-writing and appears on `/imports`; the manual sync command gives the same answer on demand.
3. Check the dry run's counts, then set `EASYBANK_SYNC_WRITE=true` to enable writing.
4. Rollback: unset the credentials or remove the schedule from `nuxt.config.ts`; the `import_runs` table may stay. No transaction row is created, altered, or removed by a rollback.

## Open Questions

- **O1 — Whether the bank requires app confirmation or SCA for a read-only run.** Answered by the spike: the login and the transaction list need none; the CSV export and the search panel do. The sync uses only the former.
- **O2 — The exact requests of the list flow, its cookies, and its paging.** Captured by the spike; the CSV download was dropped once it proved to need app confirmation.
- **O3 — Retention of `import_runs`.** Unbounded for now; the read endpoint is bounded, so growth is a disk concern only at a scale this app will not reach.
- **O4 — Whether the nightly time should be runtime-configurable.** Fixed in `nuxt.config.ts` for now; moving it needs a rebuild.
