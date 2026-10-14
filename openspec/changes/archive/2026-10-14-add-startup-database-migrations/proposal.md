# Proposal

## Why

Migrations are plain SQL files applied by hand with a shell loop, and nothing records which of them a database has already run. The README has to warn operators not to re-run migrations that were already applied (`README.md`, Upgrading), the loop is duplicated across the quick start, `docs/container-image.md`, and `tests/run-with-test-database.sh`, and every upgrade depends on a human remembering the database's exact state. A Flyway-style runner that applies pending migrations automatically at server startup and records them in a history table removes that memory burden and makes the database's schema state observable.

## What Changes

- Adopt `node-pg-migrate` (v9) as a runtime dependency and apply pending migrations automatically at server startup, before the server answers any request.
- Fail startup (process exits non-zero, nothing is served) when `DATABASE_URL` is missing or empty, or when migrations cannot complete: database unreachable, SQL failure, or out-of-order migration files refused by the order check.
- Record applied migrations in the runner's history table, `pgmigrations`. Adopt an existing hand-migrated database once by setting `MIGRATE_BASELINE=<version>` at startup: local migration files up to that version are recorded as applied without being executed.
- Keep `db/migrations/` as plain numbered `.sql` files with the existing `NNNN_name.sql` names and contents; they run unchanged. Application is forward-only: no down migrations.
- **BREAKING**: the server no longer starts without a reachable database. The documented "starts and serves without `DATABASE_URL`" behaviour is removed; a missing database address is a startup failure.
- Ship `db/migrations` inside the production image and apply pending migrations at startup from inside the image. Schema preparation is no longer a manual step outside the image.
- Rewire the integration-test launcher to apply migrations with the `node-pg-migrate` CLI, and wrap the browser suite in the same disposable-database launcher so it boots against a migrated database. No bypass or "skip migrations" flag exists.
- Document the new workflow in `README.md`, `docs/container-image.md`, `tests/README.md`, and `.env.example`.

## Capabilities

### New Capabilities

- `database-migrations`: the startup migration runner — automatic application before serving, failure semantics for a missing or unusable database, the `pgmigrations` history table, `MIGRATE_BASELINE` adoption, ordering and locking, and forward-only application of the plain SQL files.

### Modified Capabilities

- `backend-shell`: reverse the "migrations are left to the person running them" and "database trouble is not a startup failure" requirements; migrations now run at startup, and the shared pool remains lazily opened while the migration run uses its own short-lived connection.
- `container-image`: the image now contains the migration SQL and applies pending migrations at startup; schema preparation is no longer an explicit operator action outside the image, and a missing database address fails startup rather than serving the shell.

## Impact

- **Dependency**: `node-pg-migrate` becomes a runtime dependency (transitively `glob`, `jiti`, `yargs`).
- **New code**: a Nitro startup plugin that runs migrations before the server listens.
- **Changed code**: `tests/run-with-test-database.sh` (migrations via the CLI), `playwright.config.ts` and the `test:browser` script (disposable database), `package.json`, `Dockerfile` (copy `db/migrations`), `.dockerignore` (stop excluding `db/`).
- **Docs**: `README.md` (quick start, upgrading, development), `docs/container-image.md` (remove "Run without a database"), `tests/README.md` (browser suite prerequisites), `.env.example` (`MIGRATE_BASELINE`).
- **Existing databases**: require a one-time `MIGRATE_BASELINE` startup to adopt; no migration file is changed and no stored data is touched.
- **Unchanged**: `db/migrations/*.sql` contents, the transaction/category APIs, the frontend, the importer, and the sync.
