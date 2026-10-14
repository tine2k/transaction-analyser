# Design

## Context

See proposal.md — Why. The current state that shapes the approach:

- All three sync paths — the nightly Nitro task, `tools/easybank-sync.ts`, and the Imports-screen button through `server/api/easybank/sync.post.ts` — converge on `syncEasybank()` in `shared/easybank-sync.ts`, which finishes the import run record before returning.
- `importRows()` in `shared/transactions-import.ts` already computes the trigger: its plan carries `rowsWritten` and `rowsCategorised`, and `rowsWritten - rowsCategorised` is exactly the number of new transactions with no category. No new query is needed.
- `shared/easybank.ts` takes an injectable `fetchImpl`, and `tests/helpers/fake-bank.ts` establishes the fake-server test pattern this change reuses.
- Credentials in this project are read from `process.env` by callers (`EASYBANK_USER`, `EASYBANK_PIN`), passed as options into shared code, and never printed.
- The server runs in a container; environment variables reach both the nightly task and the screen-started sync through the container environment.

## Goals / Non-Goals

**Goals:**

- Notify once per sync run that wrote at least one new transaction of which at least one carries no category.
- Keep the notification strictly auxiliary: no effect on the import's outcome, its run record, or any stored row.
- Make the notification testable without a real Pushover account or network.

**Non-Goals:**

- No retry, queue, or delivery guarantee — a missed notification is not repaired.
- No notification for failed syncs, non-writing runs, or the manual CSV import.
- No UI change, no notification history in the database, no new runtime dependency.

## Decisions

### Hook inside `syncEasybank()`, after `finishImportRun`

All sync paths pass through this one function, so a single call site covers them all. Alternatives considered:

- Inside `importRows()`: would also cover the CSV import (out of scope), would fire before the run record is final, and would drag an outbound HTTP call into the framework-free import module used by every test.
- In the server task only: would miss the manual `npm run sync` command.

The call sits on the success path, after `finishImportRun` resolves. It runs regardless of the dry-run flag because the trigger rule (`rowsWritten > 0`) already excludes non-writing runs; no separate flag is needed.

### A new framework-free module `shared/import-notification.ts`

Exports:

- `ImportNotificationConfig = { token: string | null; user: string | null; baseUrl?: string; fetchImpl?: typeof fetch; timeoutMs?: number }`
- `notificationConfigFromEnv(env)` — reads `PUSHOVER_TOKEN` and `PUSHOVER_USER`, plus the optional `PUSHOVER_BASE_URL` override.
- `uncategorisedSummary(plan)` — pure; returns `{ title, message }`, or `null` when `rowsWritten === 0` or `rowsWritten === rowsCategorised`.
- `notifyImport(config, plan)` — builds the summary, sends it, and returns `{ status: 'sent' } | { status: 'skipped' } | { status: 'failed'; reason: string }`; it never throws, so the caller logs the failure's reason and the sync is otherwise unaffected.

`syncEasybank` logs a failure with `console.error` and otherwise ignores the outcome, so a notification failure cannot alter the returned result. Callers (`tools/easybank-sync.ts`, `server/tasks/easybank/sync.ts`) pass `notification: notificationConfigFromEnv(process.env)`. This mirrors how the bank credentials are read by callers and passed as options, and it keeps tests explicit: a test supplies its own config, and a caller that omits it gets the unconfigured default.

Alternative rejected: reading `process.env` inside `syncEasybank` — integration tests would then depend on the ambient environment, and the injectable fetch has to live in options anyway.

### Direct `fetch` against the Pushover message API, no new dependency

`POST https://api.pushover.net/1/messages.json` with form-encoded `token`, `user`, `title`, `message`. A 2xx answer whose JSON `status` is 1 is a success; anything else is a failure carrying the response's `errors` text. The request uses `AbortSignal.timeout(10_000)` (overridable through `timeoutMs` so tests can exercise the bound quickly), which bounds the attempt and keeps a screen-started sync's answer from hanging on a dead Pushover.

Alternatives rejected: a `pushover` npm package adds a dependency for one request, against the project's hand-rolled-fetch precedent; fire-and-forget without await lets the CLI process exit before the request is sent.

`PUSHOVER_BASE_URL`, when set, points the request at a test server instead of the real Pushover, mirroring `EASYBANK_BASE_URL`. It exists so the spawned-server integration test can watch the screen-started sync notify without the network, and so a manual run can be checked against a fake before the real key is trusted.

### Message wording

Title: `N new transaction(s) need(s) a category`. Message: `M new: K categorised, U without a category.` These are the counts the spec names and nothing else. Exact prose is a minor detail; the tests assert the counts and the absence of transaction details rather than the exact wording.

### Failure handling and disclosure

`notifyImport` catches everything, so no error escapes into the sync. Log lines carry only the HTTP status and Pushover's `errors` text; the request body — which holds the credentials — is never logged or recorded.

### Testing

- Unit: `uncategorisedSummary` across the trigger matrix (mixed, fully categorised, wrote nothing, dry-run plan) and the counts it states; `notifyImport` with a stub `fetchImpl` for success, non-2xx, thrown fetch, timed-out fetch, and unconfigured config.
- Integration: a `tests/helpers/fake-pushover.ts` server in the `fake-bank.ts` style that records requests. Scenarios: an uncategorised write sends exactly one message carrying the run's counts; a fully categorised write sends none; a dry run sends none; Pushover answering 500 leaves the run record a success and the rows stored; a hanging handler ends the attempt within the bound. The ordering scenario — the record is final before the attempt — is tested by having the fake handler query `import_runs` for the run and assert it already reads a finished success.
- Spawned server: the existing `easybank-sync-api.test.ts` pattern extends to the notification by starting the built server with `PUSHOVER_BASE_URL` pointed at the fake Pushover, so the screen-started sync's message is observed without the network.

## Risks / Trade-offs

- [The screen-started sync waits for the notification attempt] → bounded to 10 seconds; the run record is already final, so the log is correct even when the answer is slow.
- [A missed notification is never retried] → accepted; the Imports screen stays the source of truth and the notification is only a nudge.
- [Pushover outage, rate limit, or API change] → isolated and logged; the import is unaffected.
- [Credential leakage through logs] → only the HTTP status and Pushover's error text are logged; the request body is never printed.
- [Test flakiness from a real network] → every test uses an injected `fetch` or a local fake server.

## Migration Plan

No database migration and no schema change. Deployment is configuration only: set `PUSHOVER_TOKEN` and `PUSHOVER_USER` in the container environment (and in the environment that runs `npm run sync`) and document them, plus the `PUSHOVER_BASE_URL` test override, in the README. Rollback: unset the variables or revert the image; stored data is untouched either way.
