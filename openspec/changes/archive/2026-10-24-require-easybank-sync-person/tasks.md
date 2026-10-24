# Tasks

## 1. Shared person value and sync entry points

- [x] 1.1 Change `shared/easybank-sync.ts` so `personFromEnv` returns `string | null` (trimmed, `null` for absent/empty/whitespace), add `requirePersonFromEnv` with the startup message, and remove `DEFAULT_PERSON` and `syncEasybank`'s internal fallback. Verify no `DEFAULT_PERSON` reference remains in `shared/`, `server/`, or `tools/`, and the unit suite for the module passes.
- [x] 1.2 Update `tests/unit/easybank-sync.test.ts` to expect `null` for absent, empty, and whitespace-only values, and add `requirePersonFromEnv` cases for a usable name and for each refused value. Verify with `npx vitest run tests/unit/easybank-sync.test.ts`.
- [x] 1.3 Update `server/tasks/easybank/sync.ts` to pass `requirePersonFromEnv(process.env)`, and `tools/easybank-sync.ts` to call it after the `--help` exit and before the `DATABASE_URL`/client step; update the usage text to state the variable is required. Verify the nightly task path still starts with the variable set and that the command's help text no longer mentions a `Default` fallback.
- [x] 1.4 Add a command test that spawns `node tools/easybank-sync.ts` with `EASYBANK_PERSON` absent or blank and asserts a non-zero exit naming the variable without a database connection, plus a `--help` run that exits zero without the variable. Verify with `npx vitest run tests/unit/easybank-sync-command.test.ts` (or the suite it is added to).

## 2. Startup enforcement and deployment documentation

- [x] 2.1 Add `server/plugins/easybank-person.ts` that reads the environment at module scope, logs the `requirePersonFromEnv` failure, and exits 1 so no port is bound, following the migrations plugin's pattern. Verify by building and starting `.output/server/index.mjs` with a usable `DATABASE_URL` and no `EASYBANK_PERSON`: it exits 1, serves nothing, and the message names the variable.
- [x] 2.2 Add an integration test that spawns the built server with the disposable database and without `EASYBANK_PERSON`, asserting exit code 1, no health response, and the variable named in the output, plus a check that a startup with the variable set serves. Verify with the integration suite.
- [x] 2.3 Supply `EASYBANK_PERSON` in every spawned-server environment in `tests/integration/` (`api.test.ts`, `category-patterns-api.test.ts`, `category-recategorisation-api.test.ts`, `easybank-sync-api.test.ts`, `manual-category-assignment.test.ts`, `notification-test-api.test.ts`) and in `playwright.config.ts`'s `webServer.env`. Verify the integration suite starts every server it spawns, and `tests/browser/imports-sync.spec.ts` passes headless.
- [x] 2.4 Document the requirement: make `EASYBANK_PERSON` a required entry in `.env.example`, add `--env EASYBANK_PERSON=Default` to the README quick-start `docker run`, replace the fallback sentences in the README sync and upgrade sections with the startup requirement, add the variable to local development, and add `--env EASYBANK_PERSON` to both `docs/container-image.md` run examples and its startup-failure paragraph. Verify each documented command and variable name matches the code and that no `Default` fallback claim remains in those files.

## 3. Sync behavior without the fallback

- [x] 3.1 Rewrite the `person: ''` cases in `tests/integration/easybank-sync.test.ts` so an empty person records a failed run and writes nothing, and remove the renamed-`Default` fallback test; keep the configured, case-insensitive, unknown-person, and run-record assertions. Verify with the integration suite.
- [x] 3.2 Confirm `tests/integration/easybank-sync-api.test.ts` sets `EASYBANK_PERSON` for its configured-person and unconfigured-credentials cases and that the screen-started, nightly-equivalent, and manual paths all resolve the same person. Verify with the integration suite.

## 4. Integration verification

- [x] 4.1 Run `npm test` (unit, components, integration) and `npm run test:browser` with headless Chromium, and confirm the startup-refusal, command-refusal, no-fallback, and configured-person scenarios from the delta spec all pass.

## Workflow follow-up

- Archive the change after review and verify the archived result.
