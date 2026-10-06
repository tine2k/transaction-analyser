# Design

## Context

See `proposal.md` for motivation and the delta specs for the required behavior. The pieces this
change builds on already exist:

- `server/tasks/easybank/sync.ts` runs `syncEasybank` through the shared pool, reading the window,
  floor, and non-writing mode; Nitro's task runner (`runTask`) already refuses a second concurrent
  run of a task by returning the in-flight promise (recorded in the archived
  `add-easybank-sync` design, D2), and `runTask` is auto-imported in server context.
- `shared/easybank-sync.ts` is the framework-free sync; `ImportSourceKind` in
  `shared/transactions-import.ts` is `'manual' | 'scheduled'`.
- `app/pages/imports.vue` reads `GET /api/imports` with `useFetch` and labels `scheduled` and
  `manual`; `app/pages/categories.vue` shows the project's write pattern: `$fetch` for the write,
  then `refresh()` of the list.
- `import_runs.source` is free text with no constraint, so a new source needs no migration.

## Goals / Non-Goals

**Goals:**

- One same-origin control on `/imports` that starts exactly the sync the schedule runs.
- One in-process guard shared with the nightly run, so runs never overlap.
- A run record that tells a screen-started sync apart from the schedule and the CSV import.

**Non-Goals:**

- No authentication or authorization; the endpoint admits every requester like the rest.
- No options on the control (no window, no write override); it runs the nightly defaults.
- No live progress or polling; the request waits and the log is refreshed when it answers.
- No change to the CLI sync, the nightly schedule, the retrieval, or the database schema.

## Decisions

### D1 — The endpoint starts the existing task through `runTask`

`POST /api/easybank/sync` calls `runTask('easybank:sync', { payload: { source: 'ui' } })` and
answers with the task result. This reuses the task's credentials, window, floor, non-writing mode,
and shared pool, and inherits Nitro's per-process concurrency guard: a request arriving while a
run is in progress receives that run's promise instead of starting a second run.

*Alternatives considered:* the endpoint calling `syncEasybank` directly — it would need its own
lock and could still race the nightly run; a separate `easybank:sync-ui` task — the guard is
per task name, so two tasks could run at once, and the body would be duplicated.

### D2 — The task takes its source from the payload, defaulting to `scheduled`

`server/tasks/easybank/sync.ts` reads `payload.source`: `'ui'` when the screen started it, and
`'scheduled'` otherwise. The schedule passes no source, so the nightly record is unchanged; the
CLI keeps recording `manual`.

*Alternatives considered:* the endpoint recording `scheduled` — the log would lie about who
started the run; a second task — see D1.

### D3 — A new source value `ui`, shown as "Manual sync"

`ImportSourceKind` gains `'ui'`, and `sourceLabel` in `app/pages/imports.vue` maps it to
"Manual sync". No migration: the column is free text, existing rows are untouched, and the
screen's fallback already renders an unknown source verbatim.

*Alternative considered:* reusing `manual` — the log would conflate the screen-started sync with
the CLI sync and the CSV import, which is the conflation this change removes for the new path.

### D4 — The endpoint answers 200 with a status for every sync outcome

The body is `{ status: 'success' | 'failed' | 'unconfigured' }`. A failed sync is a recorded
domain outcome, not an HTTP failure; the screen shows the status and refreshes the log, where the
reason is. An unexpected server error (for example, the database unreachable before the run
record could be written) propagates as a 500 with a generic message, and the screen says the sync
could not be started.

*Alternatives considered:* 502 for a failed run and 503 for unconfigured — the browser would
special-case statuses to display the same three outcomes.

### D5 — The screen follows the categories write pattern

`app/pages/imports.vue` posts with `$fetch`, disables the control while the request is in flight,
then calls the existing `refresh()` and shows the outcome. `mockNuxtImport('$fetch')` is already
the project's component-test pattern (see `tests/components/categories.test.ts`).

### D6 — The task reads an optional `EASYBANK_BASE_URL`

`server/tasks/easybank/sync.ts` passes `process.env['EASYBANK_BASE_URL']` as the sync's `baseUrl`;
unset or empty means the real bank, and the CLI is unchanged. This is the seam the endpoint
integration test uses to reach the fake bank in a spawned server process, and it lets an operator
point a self-hosted instance at a test bank. It is documented in `.env.example` and the README.

*Alternative considered:* no override — the endpoint test would be limited to the unconfigured
path, leaving the run itself unverified end to end.

## Risks / Trade-offs

- **A long run can outlive a proxy's timeout** → The run continues server-side and is recorded;
  the log shows it after the next refresh even if the browser saw an error. Accepted for a
  self-hosted, single-user deployment; the button's busy state covers the normal case.
- **The endpoint is unauthenticated and can start write-capable runs** → It starts a run only when
  the server environment holds the bank credentials, which are never returned, and the in-flight
  guard caps concurrency at one. Repeated clicks after a run completes still start repeated runs;
  accepted because every other request is equally open, and the shell spec already names this as
  the first requirement to revisit if the application is exposed beyond the operator's machine.
- **A click during the nightly run answers with the nightly run and records no `ui` run** → The
  spec states this explicitly ("whichever start the in-progress run came from"), and it is
  preferable to two overlapping bank logins.
- **The concurrency guard is per server process** → The project deploys one container; a second
  instance was already out of scope in the archived `add-easybank-sync` design (R6).
- **`EASYBANK_BASE_URL` left set by mistake would send the sync to the wrong host** → It is unset
  by default and documented as a test override; the credentials still have to be valid there.

## Migration Plan

No schema or data migration. Deploy the new build with the existing environment. Rollback is a
revert of the image: older code ignores the `ui` source and renders it verbatim on the screen.
