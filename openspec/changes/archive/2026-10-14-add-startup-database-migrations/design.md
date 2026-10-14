# Design

## Context

See proposal.md for motivation. The facts that shape the approach:

- Migrations are plain SQL at `db/migrations/0001..0008_*.sql`, each a header comment plus statements, never edited after they are applied. They are applied today by shell loops in `README.md`, `docs/container-image.md`, and `tests/run-with-test-database.sh:59-64`; nothing records what a database has already run.
- The server is Nuxt 4 / Nitro (`nitropack` 2.13.4), one process, TypeScript, raw `pg` with no ORM. `server/utils/db.ts:18` builds a shared pool lazily; `server/plugins/database.ts` is the existing startup-plugin example (it only hooks shutdown). `backend-shell` currently promises the server starts and serves with no database reachable.
- Nitro plugins are called synchronously and their returned promises are never awaited (`node_modules/nitropack/dist/runtime/internal/app.mjs:156-165`), but plugin modules are imported statically by the generated `#nitro-internal-virtual/plugins` module (`node_modules/nitropack/dist/rollup/index.mjs:1973`). Module evaluation therefore can gate server creation, while an `async` plugin alone cannot.
- `node-pg-migrate` v9 is ESM, requires Node >= 20.11 (project: >= 24), peer-depends on `pg` (already present) and brings `glob`, `jiti`, `yargs`. Its legacy SQL loader treats a `.sql` file with no `-- Up Migration` marker as a whole-file up migration, so `0001`–`0008` run unchanged. It records applied migrations in `pgmigrations` (`id`, `name`, `run_on`), takes an advisory lock (`advisoryLockMode` `fail`/`wait`), checks order (`checkOrder`), runs each migration in its own transaction by default in the programmatic API (`singleTransaction` defaults false there, true in the CLI), supports `fake` (record without running), `count`, and `dryRun`. It has no checksum validation (issue #1138).
- `.dockerignore:11` excludes `db/`, and the runtime image copies only `.output` (`Dockerfile:17-27`), so the deployed artifact currently contains no migrations.
- `tests/run-with-test-database.sh` creates a disposable database, applies migrations with raw `psql` and loads fixtures before the wrapped command runs; `playwright.config.ts:18-28` starts the built server with `DATABASE_URL: ''` and the browser specs mock every `/api/**` call.

## Goals / Non-Goals

**Goals:**

- Pending migrations apply automatically while the server starts, before the first request is answered, recorded in a history table.
- A missing address, an unreachable database, or a failed migration stops the process with a non-zero exit and no serving.
- A hand-migrated database is adopted once through `MIGRATE_BASELINE` without re-running anything.
- Development, tests, and the container all use the same files and the same runner.
- The migration run never opens the shared pool, never prints a credential, and never blocks two starts into double-applying.

**Non-Goals:**

- Checksum immutability enforcement (the library has none; "never edit an applied migration" stays a convention, as today).
- Down migrations; application is forward-only.
- Generating migrations from a schema or introducing an ORM.
- Renaming or reformatting `db/migrations/*.sql` or changing the transition to `pgmigrations` naming beyond what the library requires.
- Zero-downtime patterns (`CREATE INDEX CONCURRENTLY` and `-- noTransaction`) — available in the library, deferred until a migration needs one.

## Decisions

### D1 — Migrate at application startup, inside the Nuxt/Nitro process

A startup step runs before the server listens. This was the user's choice over a separate `npm run migrate` command and over a container-entrypoint step: it removes the manual step entirely and keeps "one process, one command" true (`backend-shell`).

*Alternative considered:* an operator command (rejected: leaves the memory burden the change exists to remove); a container entrypoint wrapper (rejected: still one process serving, but splits the behavior between image and application and makes `npm run dev` diverge from production).

### D2 — Use `node-pg-migrate` v9 as the runner

The library supplies order checking, advisory locking, per-migration transactions, `fake`, `dryRun`, and filesystem SQL loading with its legacy loader accepting our files unchanged. It is actively maintained and peer-depends on the `pg` already in use.

*Alternatives considered:* hand-rolled runner (perfect control, but owns locking/transactions/ordering correctness); `postgres-migrations` (closest philosophy — hashes + locks — but unreleased since 2021 and no baseline concept); `postgrator` (has checksums, but its filename pattern would force renaming every existing file, which the README and specs reference). *Accepted loss:* no checksum validation, so an edited applied migration is not detected; the existing convention against editing remains, unenforced, exactly as today. The ledger is the library's `pgmigrations` rather than a bespoke `schema_migrations`; baseline rows are indistinguishable from ordinary rows in it.

### D3 — Fail fast on any condition that prevents a correct start

Missing or empty `DATABASE_URL`, unreachable database, SQL failure, a refused out-of-order file, or an unadopted non-empty schema all end the process with a non-zero exit before serving. An operator sees the reason in the logs; the container restart policy retries.

*Alternatives considered:* serve anyway with a logged error (rejected: serves against an unknown schema); gate database-backed endpoints with 503 while retrying (rejected: more state and complexity for a single-operator application).

### D4 — Adoption through `MIGRATE_BASELINE`, consumed at startup

On startup, when `pgmigrations` is missing or holds no rows and the database holds a schema (any table in `public` other than `pgmigrations`):

- `MIGRATE_BASELINE` unset → exit non-zero with a message naming the variable.
- `MIGRATE_BASELINE=<version>` naming a local file → record the local files up to and including that version as applied without executing them, then apply files above it normally. Implementation maps the version to the count of pending local files with a version at or below it and invokes the runner with `fake: true` and `count: N`. If `fake` with `count` does not limit the run as expected, the fallback is to invoke the runner with `fake: true` and a `dir` containing only the files at or below the baseline (a temporary directory of symlinks), which uses only documented options.
- `MIGRATE_BASELINE` naming no local file → exit non-zero.

When the history has rows, the variable is ignored (a warning is logged if set). When the database is empty (no schema, no history), every migration is applied normally and the variable is ignored. The non-empty-schema check avoids consulting file contents, matching the "structural only" posture of the schema specs.

*Alternatives considered:* an explicit `npm run migrate --baseline` command (rejected by the user in favour of a single automatic path); auto-detecting the applied version (rejected: the runner cannot know how far a hand-migrated database actually got, and guessing skips or re-runs real migrations).

### D5 — Load migrations from the filesystem and ship `db/migrations` in the image

The runner is pointed at `db/migrations` relative to the process's working directory (repository root in development, `/app` in the container). `.dockerignore` stops excluding `db/`, and the Dockerfile runtime stage copies `db/migrations` into the image. The same directory serves the startup plugin, the test launcher's CLI invocation, and a developer's manual `node-pg-migrate` runs.

*Alternative considered:* bundling the SQL through Nitro server assets or an in-memory `migrations` map of `?raw` imports (rejected: more custom code, and it would create two loading paths — filesystem in tests, bundled at runtime — that could diverge in history naming).

### D6 — Gate the server on the migration run with a top-level `await` in the plugin module

Because `runNitroPlugins` does not await plugin promises, the migration promise is awaited at module scope of `server/plugins/database-migrations.ts`, so the statically imported plugin module — and therefore application creation and listening — waits for it. On failure the rejection propagates during module evaluation and the process exits non-zero. The migration logic itself lives in `server/utils/migrations.ts` (env validation, schema detection, baseline handling, runner invocation) so the plugin file stays thin.

*Finding during implementation:* Nitro transforms server code with an esbuild target of `es2019`, which refuses top-level await at build time. `nuxt.config.ts` therefore sets `nitro.esbuild.options.target` to `esnext`; the project's engines require Node >= 24, so no downleveling is needed. The request-hook fallback remains if that ever regresses.

*Fallback if top-level await misbehaves in either dev or production:* register a `request` hook that awaits the migration promise and refuses or queues requests until it settles. This is a mechanism detail; the observable behavior (no request answered before migration completes, failure means no serving) is fixed by the `database-migrations` spec either way. A task verifies the chosen mechanism against the built server.

### D7 — The migration run uses its own connection, not the shared pool

`runner({ databaseUrl: process.env.DATABASE_URL, ... })` opens and closes its own `pg` client for the duration of the run. `server/utils/db.ts` is untouched: the shared pool is still built on first use and still opened only by a statement, and no pool connection is held across startup. The advisory lock lives on the runner's session, which is exactly the lifetime it needs.

*Alternative considered:* handing the runner a `PoolClient` from `useDatabase()` (rejected: opens the shared pool during startup for no benefit and keeps the lock's session tied to the pool).

### D8 — Advisory lock mode `wait`

A second process starting against the same database waits for the first process's lock, then finds nothing pending. The lock is released automatically if the holder dies, so a crash cannot wedge startup permanently.

*Alternative considered:* the library default `fail` (rejected: turns a routine overlapping restart into one process exiting, relying on the restart policy).

### D9 — Per-migration transactions at startup, forward-only

The programmatic API's default (`singleTransaction: false`) gives each migration its own transaction, so a failure leaves that migration's changes and history row absent while completed migrations stay recorded; a retry resumes at the failed file. Startup always uses `direction: 'up'` and never a down migration. The test launcher's CLI invocation may keep the CLI default (`--single-transaction`) because it runs against a fresh disposable database.

*Alternative considered:* wrapping all pending migrations in one transaction (rejected for startup: a failure would roll back completed migrations and make retries repeat work needlessly).

### D10 — Test wiring: one disposable database, no bypass flag

`tests/run-with-test-database.sh` applies migrations with the library's CLI (`node-pg-migrate up -m db/migrations` against the disposable database, using an explicit connection from the script) instead of the `psql` loop, then loads fixtures as before. The browser suite runs under the same launcher: `test:browser` wraps its Playwright run, and `playwright.config.ts` passes `TEST_DATABASE_URL` as the built server's `DATABASE_URL`, so the suite boots against a migrated database with every `/api/**` call still mocked. No "skip migrations" or "allow missing database" switch is introduced anywhere.

*Alternative considered:* keeping raw `psql` in the launcher (rejected: the built server would then see tables with an empty history and try to re-apply `0001`); a test-only escape hatch (rejected by the user: a flag that can lie about schema state in production).

### D11 — Errors and logs never carry a credential

The runner is given a logger that suppresses verbose query output, and any error surfaced at startup is redacted with the existing `redact` helper from `shared/transactions-import.ts` before it is logged, so a `pg` error message cannot leak an address or user name. This carries `backend-shell`'s non-disclosure requirement into the new startup path.

## Risks / Trade-offs

- **Baseline correctness is operator-dependent.** A `MIGRATE_BASELINE` higher than a database's real state silently skips migrations. → Mitigation: baseline only applies when the history is empty; the run logs the versions recorded without execution; the remedy (a corrective migration) is documented; the integration test covers baseline-and-then-pending behavior.
- **No checksum enforcement.** An edited applied migration goes undetected. → Mitigation: the convention and the code-review expectation remain; accepting this is explicit in the proposal and specs.
- **Nitro gating mechanism is version-sensitive.** Top-level await depends on how Nitro evaluates plugin modules. → Mitigation: a task verifies the built server's behavior (request not answered during a deliberately slowed migration, failure exits non-zero); the request-hook fallback is specified in D6.
- **Dependency tracing.** `node-pg-migrate` and its transitive dependencies must end up in the production image's `.output/server/node_modules`. → Mitigation: a task builds the image and runs it against a disposable database; if tracing misses a dependency, the Dockerfile's runtime-dependencies stage and/or Nitro's externalization are adjusted there.
- **The server no longer starts without a database.** The documented "run without a database" path is removed. → Mitigation: the failure message names `DATABASE_URL`; README, `docs/container-image.md`, and `tests/README.md` are updated in the same change; unit tests are unaffected because they mock `pg`.
- **`pgmigrations` binds the history shape.** Switching runners later means adopting a new history table. → Accepted: the rows are `name`/`run_on`, trivially readable, and no stored transaction data is involved.
- **`fake` + `count` is not demonstrated in the library's docs.** → Mitigation: the integration test exercises the baseline path on a disposable database seeded with a hand-applied schema; the D4 fallback uses only documented options.

## Migration Plan

1. **Existing databases (the operator's real database and any development database):** after deploying this change, start once with `MIGRATE_BASELINE=0008` (the highest applied file at rollout). The startup records `0001`–`0008` as applied without running them. The variable may be left set or removed — it is ignored once history exists.
2. **Fresh databases:** start normally; all files apply in order.
3. **Upgrade documentation:** `README.md`'s quick start and Upgrading sections, `docs/container-image.md`'s preparation section, and `tests/README.md`'s browser prerequisites are rewritten in the same change; the `psql` loop disappears from all three.
4. **Rollback:** the change adds no schema and edits no migration file, so reverting the application to a previous image is safe — the ignored `pgmigrations` table and its rows remain. A bad future migration is corrected by a new forward migration, or by restoring the backup written by `tools/backup-postgres.sh`.

## Open Questions

- Whether to expose a convenience manifest script (`npm run migrate` / a dry-run status command) in addition to documenting the library CLI — deferrable; nothing in the specs or the startup path depends on it.
- Whether to document the `-- noTransaction` header for future `CREATE INDEX CONCURRENTLY` migrations — deferrable until a migration needs it.
