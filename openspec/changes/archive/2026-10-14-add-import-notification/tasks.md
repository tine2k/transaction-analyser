# Tasks

## 1. Notification module

- [x] 1.1 Create `shared/import-notification.ts` with `ImportNotificationConfig`, `notificationConfigFromEnv` (reads `PUSHOVER_TOKEN`, `PUSHOVER_USER`, optional `PUSHOVER_BASE_URL`), `uncategorisedSummary` (returns null when `rowsWritten === 0` or `rowsWritten === rowsCategorised`), and `notifyImport` (never throws; returns `sent`/`skipped`/`failed`); verify with unit tests in `tests/unit/import-notification.test.ts` covering the trigger matrix, the stated counts, and env reading, passing under `npm run test:unit`.
- [x] 1.2 Add unit tests for `notifyImport` with a stub `fetchImpl`: a success posts `token`, `user`, `title`, and `message` to `/1/messages.json`; a non-2xx answer, a thrown fetch, and a fetch that outlives a short `timeoutMs` each return `failed`; an unconfigured config returns `skipped` without calling fetch; verify `npm run test:unit`.

## 2. Sync path wiring and integration tests

- [x] 2.1 Add a `notification` option to `EasybankSyncOptions` (default unconfigured) and call `notifyImport` in `syncEasybank` on the success path after `finishImportRun`, logging a failed outcome with `console.error`; verify with the integration tests added in 2.3 and 2.4.
- [x] 2.2 Add `tests/helpers/fake-pushover.ts` in the `fake-bank.ts` style: records each request, can answer success, an error, or never answer, and closes cleanly; verify it records a request and closes in a test run.
- [x] 2.3 Add `tests/integration/import-notification.test.ts` covering the trigger: a writing sync with a mixed outcome sends exactly one message carrying the run's counts; a fully categorised write, a run that wrote nothing, a dry run, a failed run, and the manual CSV import each send none; verify `npm run test:integration`.
- [x] 2.4 Extend the integration tests with isolation and ordering: a Pushover error and an unreachable Pushover each leave the run recorded as a success with its rows stored; the fake handler sees the run's record already finished when it is called; a handler that never answers ends within a short `timeoutMs`; verify `npm run test:integration`.
- [x] 2.5 Pass `notification: notificationConfigFromEnv(process.env)` from `tools/easybank-sync.ts` and `server/tasks/easybank/sync.ts`, and extend `tests/integration/easybank-sync-api.test.ts` with a writing server whose `PUSHOVER_BASE_URL` points at the fake Pushover: the screen-started sync sends one message and still answers `{ "status": "success" }`; verify `npm run test:integration`.

## 3. Documentation

- [x] 3.1 Document `PUSHOVER_TOKEN`, `PUSHOVER_USER`, and the `PUSHOVER_BASE_URL` test override in the README beside the Easybank sync configuration, including that unset credentials send no notification and fail nothing, and that a notification failure never fails a sync; verify the documented names match `notificationConfigFromEnv` and the documented container example still runs as written.

## 4. Whole-suite verification

- [x] 4.1 Run `npm test` (unit, components, and integration) and confirm every suite passes with no regression; fix any failure before finishing.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied; the archive workflow commits and pushes per AGENTS.md.
