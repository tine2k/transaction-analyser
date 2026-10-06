# Tasks

## 1. Source and Task Plumbing

- [x] 1.1 Add `'ui'` to `ImportSourceKind` in `shared/transactions-import.ts` and add a `syncSourceFromPayload(payload)` helper to `shared/easybank-sync.ts` that maps `payload.source === 'ui'` to `'ui'` and every other value to `'scheduled'`; verify with unit tests for an empty payload, the `ui` payload, and an unknown value, and run `npm run test:unit`
- [x] 1.2 Make `server/tasks/easybank/sync.ts` take the source from the payload with the helper and pass `baseUrl: process.env['EASYBANK_BASE_URL']` to `syncEasybank`; verify `npm run build` succeeds and the built server records the `ui` source in the endpoint integration tests of 2.2
- [x] 1.3 Document `EASYBANK_BASE_URL` in `.env.example` (empty value) and in the README's sync section (optional; unset means the real bank); verify the example holds no value and the README's wording matches the task's behavior

## 2. Sync-Start Endpoint

- [x] 2.1 Add `server/api/easybank/sync.post.ts`: it calls `runTask('easybank:sync', { payload: { source: 'ui' } })`, answers 200 with `{ status: 'success' | 'failed' | 'unconfigured' }`, and answers an unexpected failure with a 500 whose message discloses no internals; verify with the integration tests below and a request using another method starting no run
- [x] 2.2 Add `tests/integration/easybank-sync-api.test.ts` spawning the built server against a disposable database and the fake bank (`EASYBANK_BASE_URL` set, credentials set, `EASYBANK_SYNC_WRITE` unset): a `POST` answers success and leaves exactly one run recorded with source `ui`, non-writing, and the fake bank's counts, with no transaction written; a repeated `POST` records every row as already stored; verify these assertions
- [x] 2.3 Extend the same suite: empty credentials → 200 `unconfigured` and no run recorded; a rejected login → 200 `failed` with a failed record and zero written; a second server started with `EASYBANK_SYNC_WRITE=true` → the run writes the rows and is recorded as writing; a `GET` to the sync path starts no run; verify these assertions
- [x] 2.4 Add a concurrency check: extend `tests/helpers/fake-bank.ts` with an awaited `delayMs` option, send a second `POST` while the first run is held open, and assert one run record and the same outcome on both answers; verify these assertions

## 3. Imports Screen Control

- [x] 3.1 Add the control to `app/pages/imports.vue`: a button that posts to `/api/easybank/sync` with `$fetch`, disables itself and shows a busy state until the answer, then calls the existing `refresh()` and shows the outcome (success, failed, not configured, request failed), and maps the `ui` source to "Manual sync"; keep the control at least 44px tall like the other touch controls; verify with component tests covering each state, the source label, and that no second request can start while one is in flight
- [x] 3.2 Add a headless-Chromium Playwright check that the control is on `/imports`, clicking it issues a `POST` to `/api/easybank/sync`, the status is shown, and the log is re-requested, intercepting the API as `tests/browser/responsive.spec.ts` does; verify with `npm run test:browser`

## 4. Integration Checks

- [x] 4.1 Run the full suite (`npm test`) against a disposable database and the fake bank and confirm the unit, component, and integration suites pass together, per AGENTS.md's database-test rules
- [x] 4.2 Start the built output against a disposable database and the fake bank, `POST` to `/api/easybank/sync`, and confirm the answer, the `ui` run on `GET /api/imports`, and that no credentials records no run; verify the recorded commands and responses

## Workflow follow-up

- Review the change and, once satisfied, archive it with the project's archive workflow.
- Verify the archived result updates `easybank-sync`, `import-log`, `backend-shell`, and `frontend-shell` in the main specs.
