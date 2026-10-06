# Proposal

## Why

The Easybank sync runs only on the nightly schedule or by hand from a shell with a database
address. There is no way to start it from the running application, so checking the login, the
retrieval, and the counts on demand means shell access to the server. The imports screen already
shows what each run did; a control there would put the trigger next to its result.

## What Changes

- Add a sync-start endpoint at `POST /api/easybank/sync` that runs the same sync the nightly
  schedule runs — the same credentials read from the environment, the same retrieval window, the
  same value-date floor, the same non-writing mode until `EASYBANK_SYNC_WRITE=true` — through the
  same task and the shared import path.
- Make the endpoint wait for the run and answer with its outcome. A request that arrives while a
  run is in progress joins that run instead of starting a second, so two sync runs never overlap,
  including a click during the nightly run.
- Record a screen-started run under a new source, `ui`, shown as "Manual sync" in the import log,
  distinct from the scheduled sync and the manual CSV import.
- Add a control to the `/imports` screen that starts the sync, shows that it is running, reports
  the outcome, and refreshes the log. When the bank credentials are absent it says the sync is not
  configured and no run is recorded; a failed run is recorded and appears in the refreshed log.
- **BREAKING** for `backend-shell`: the API surface currently forbids any endpoint that starts an
  import. It gains exactly one such endpoint, and no other request may start an import.
- **BREAKING** for `frontend-shell`: the shell's guarantee is currently that no browser request
  can start the sync. A browser request can now start a run that writes transactions when writing
  is enabled; the browser itself still runs no statement and writes nothing — the server performs
  the run through the shared import path.
- Read an optional `EASYBANK_BASE_URL` in the task, defaulting to the real bank, so the
  automated suite can exercise the endpoint against a test bank and an operator can point a
  self-hosted instance at one. The CLI is unchanged.
- No schema change: `import_runs.source` is free text, so the new source needs no migration and
  the existing table is untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `easybank-sync`: the sync gains a second manual start — from the imports screen — that runs the
  same credentials, window, floor, and non-writing mode as the nightly run, records the run under
  its own source, and never overlaps another run.
- `import-log`: the run starters now include a screen-started sync; the imports screen shows the
  new source distinguishably and carries the control that starts the run.
- `backend-shell`: the API surface gains the one sync-start endpoint, and the blanket prohibition
  on any endpoint that starts an import is narrowed to that endpoint.
- `frontend-shell`: the shell may start the sync through the sync endpoint; its no-write guarantee
  becomes "the browser writes nothing itself" rather than "no browser request can start the sync".

## Impact

- **Server**: new `server/api/easybank/sync.post.ts`; the `easybank:sync` task accepts a source
  payload; `ImportSourceKind` in `shared/transactions-import.ts` gains `ui`.
- **Frontend**: `/imports` gains the sync control with its idle, running, success, failure, and
  not-configured states; the source label gains "Manual sync".
- **Schema**: none. `import_runs.source` is free text and no migration is added.
- **Configuration**: optional `EASYBANK_BASE_URL` in `.env.example` and the README; unset means
  the real bank.
- **Tests**: component tests for the control's states, an integration test for the endpoint
  against a disposable database and the fake bank, and a browser check that the control reaches
  the endpoint. The existing suites must keep passing.
- **Security**: the endpoint is unauthenticated like every other request the application admits,
  and anyone who can reach the server can start a run that writes transactions when writing is
  enabled. It starts a run only when the server's environment holds the bank credentials, which
  are never sent to the browser. This is the first requirement to revisit if the application is
  ever served beyond the machine of the person running it.
