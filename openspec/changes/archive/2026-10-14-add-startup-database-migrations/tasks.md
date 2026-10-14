# Tasks

## 1. Runner dependency and disposable test databases

- [x] 1.1 Add `node-pg-migrate` to `dependencies` in `package.json` (the built server imports it at runtime, so it is not a dev dependency) and install it; verify `npm install` succeeds and `node_modules/.bin/node-pg-migrate --version` prints a version
- [x] 1.2 Replace the `psql` migration loop in `tests/run-with-test-database.sh:59-64` with a `node-pg-migrate up -m db/migrations` run against the disposable database (move the connection-string construction before the migration step), keeping the fixtures load and the existing readiness check; verify `npm run test:integration` passes and the disposable database records one `pgmigrations` row per file
- [x] 1.3 Update the launcher paragraph in `tests/README.md:41` to state that migrations are applied with the runner and recorded in the database; verify the text matches what `tests/run-with-test-database.sh` actually does

## 2. Startup migration in the server

- [x] 2.1 Create `server/utils/migrations.ts` with the pure helpers and the runner invocation per design D4-D9: environment validation, empty/non-empty schema detection, `MIGRATE_BASELINE` version normalisation and pending-count computation, and one `runner({ databaseUrl, dir: 'db/migrations', migrationsTable: 'pgmigrations', direction: 'up', checkOrder: true, advisoryLockMode: 'wait', log })` call; verify new `tests/unit/migrations.test.ts` covers version normalisation, baseline counts, and the empty/non-empty schema decision with the runner mocked, and `npm run test:unit` passes
- [x] 2.2 Create `server/plugins/database-migrations.ts`, awaiting the startup run at module scope per design D6 and logging redacted errors per design D11; verify with `npm run build` and then starting `.output/server/index.mjs` against (a) an empty disposable database — the server answers `/api/health` and `pgmigrations` holds one row per file — and (b) a database already migrated by the launcher — the server answers and records no new row
- [x] 2.3 Verify the failure paths against disposable databases: starting with `DATABASE_URL` unset or empty exits non-zero naming the variable; an unreachable address exits non-zero; with a temporary deliberately-failing file added to `db/migrations` (removed afterwards) the start exits non-zero and the failed file leaves no history row and no partial change
- [x] 2.4 Verify baseline adoption: apply `db/migrations/*.sql` with `psql` to a disposable database (no history), then starting with `MIGRATE_BASELINE=0008` serves and records one row per file without executing the SQL; starting the same database without the variable exits non-zero naming the variable; `MIGRATE_BASELINE=9999` exits non-zero; leaving the variable set after adoption is a no-op
- [x] 2.5 Document `MIGRATE_BASELINE` in `.env.example` and the new development prerequisite (a reachable `DATABASE_URL`) in `README.md`'s Development section; verify both descriptions match the behavior observed in 2.3 and 2.4

## 3. Container image and browser suite

- [ ] 3.1 Stop excluding `db/` in `.dockerignore:11` and copy `db/migrations` into the runtime stage of the `Dockerfile`; verify the image builds and its filesystem contains `db/migrations` with the unchanged SQL files
- [x] 3.2 Wrap `npm run test:browser` with `tests/run-with-test-database.sh` and point `playwright.config.ts`'s webServer `DATABASE_URL` at `TEST_DATABASE_URL`; verify `npm run build && npm run test:browser` passes with every `/api/**` call still mocked
- [x] 3.3 Rewrite the browser-suite prerequisites in `tests/README.md` (local PostgreSQL is now required) and the preparation sections of `docs/container-image.md` and `README.md` (remove the `psql` loop and the "no migration tracking table" instruction, add the one-time `MIGRATE_BASELINE` adoption); verify no stale migration instruction remains by searching `README.md`, `docs/container-image.md`, and `tests/README.md` for the removed wording

## 4. Integration checks

- [x] 4.1 Run `npm test` and `npm run test:browser` in sequence; verify all unit, component, integration, and browser suites pass
- [ ] 4.2 Build the production image and run it via the disposable-database wrapper in `docs/container-image.md`, against a fresh database and then an adopted one (schema applied with `psql`, started once with `MIGRATE_BASELINE`); verify the image serves `/api/transactions` from the fixture rows and `pgmigrations` records the applied files
- [ ] 4.3 Confirm this change edited no migration file: `git diff --stat db/migrations/` returns no output and the files in `4.2` were applied byte-for-byte

## Workflow follow-up

- Archive the change after implementation and review, per the project's OpenSpec workflow.
