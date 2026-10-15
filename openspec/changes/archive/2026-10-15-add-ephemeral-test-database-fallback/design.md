# Design

## Context

See proposal.md for motivation. `tests/run-with-test-database.sh` currently fails at its `pg_isready --dbname=postgres` check when no server is reachable, and it assumes the developer started one. The repository's documented test environment is the locally installed PostgreSQL 18.6; the suite never requires Docker. In environments where no server runs and the Docker daemon is unavailable, the binaries (`initdb`, `pg_ctl`, `psql`, `createdb`, `dropdb`) are nevertheless installed, so a disposable cluster can be provisioned from them.

The launcher is shared by `test:integration`, `test:browser`, and the container-image verification snippet in `docs/container-image.md`, so it is the single place that must learn the fallback. Existing behavior to preserve: unique disposable database names for concurrent runs, migrations and fixtures applied from the repository, `TEST_DATABASE_URL` as the only database input, inherited `DATABASE_URL` unset, cleanup on exit, failure, and handled signals, and never logging the connection string.

## Goals / Non-Goals

**Goals:**

- Run the existing suites in environments with PostgreSQL binaries but no running server and no Docker.
- Keep explicit connection settings authoritative: a user who set `PGHOST`, `PGPORT`, or `PGHOSTADDR` still gets today's failure instead of a silent substitute.
- Reuse the installed PostgreSQL 18.6 binaries and the existing disposable-database lifecycle; no new dependencies.
- Keep concurrent runs isolated and cleanup reliable on success, failure, and interruption.

**Non-Goals:**

- Installing or bundling PostgreSQL; the fallback uses only binaries already on `PATH`.
- Provisioning a server for application development or for the Docker-based container-image verification.
- Changing migrations, fixtures, integration tests, or application behavior.
- A version gate: the launcher does not check the running server's version today, and the fallback keeps that contract.

## Decisions

### Put the fallback inside the launcher

Extend `tests/run-with-test-database.sh` at its existing readiness check instead of adding a separate wrapper script. Both package scripts and the documented verification path call the launcher directly; a wrapper could be bypassed, and callers would need updating. The fallback is precisely "satisfy the launcher's precondition", so it belongs there. Alternative considered: a `tests/with-ephemeral-postgres.sh` wrapper that exports `PGHOST`/`PGPORT` and calls the launcher. Rejected because it adds a second entry point and leaves the launcher still failing when invoked directly.

### Automatic fallback, guarded by explicit server-selecting settings

When `pg_isready --dbname=postgres` fails, start the cluster only if none of `PGHOST`, `PGPORT`, or `PGHOSTADDR` is set. With any of them set, fail as today: the user named a server and must hear that it is unreachable. When the fallback starts, print one notice line naming the loopback address and port. Alternatives considered: an opt-in environment variable (rejected: the friction this change removes would remain for agents and new machines) and unconditional fallback (rejected: masks misconfiguration).

### Per-run disposable cluster under `node_modules/.cache`

Create the cluster with `mktemp -d` under `node_modules/.cache/` (created with `mkdir -p` first), start it on a random high port with retries on start failure, and use it for exactly one launcher invocation. `node_modules/` is already gitignored and dockerignored, and Playwright's output directory uses the same cache location, so no ignore changes are needed and `npm ci` clears strays. A per-run cluster keeps concurrent `npm test` runs isolated, matching the existing unique database names. Alternatives considered: a shared long-lived cluster (rejected: state management, concurrent access, and orphan handling outweigh the saved startup seconds) and the system temp directory (rejected: not writable in the target environment and outside the repository's scratch conventions).

### Cluster configuration: trust auth, loopback TCP only

Initialize with `initdb -A trust -E UTF8` and superuser `$PGUSER` when set, else the invoking OS user; start with `-c listen_addresses=127.0.0.1` and `-c unix_socket_directories=` so only TCP on loopback is served. TCP-only avoids a filesystem limitation where socket permission changes fail (`chmod ... Invalid argument`) and is uniform across platforms; trust auth is acceptable because the server is disposable, loopback-only, and carries only test fixtures. The launcher then exports `PGHOST=127.0.0.1` and `PGPORT=<port>` and proceeds unchanged, including its existing query of `current_user`, port, and host for the connection URL.

### Check server binaries only on the fallback path

`initdb` and `pg_ctl` are required only when no server is reachable. Client-only installations (for example, a machine running a server elsewhere) keep working against a reachable server. A missing binary fails with an instruction to install the PostgreSQL server binaries or start the server.

### Extend the existing cleanup trap

The trap that already drops the disposable database also stops the cluster (`pg_ctl stop -m fast`) and removes the scratch directory, in that order, and runs on normal exit, failure, and handled `INT`/`TERM`. When the cluster fails to start, the launcher prints the tail of the cluster log before exiting. The connection string is never logged, as today.

### Document in tests/README.md and AGENTS.md

`tests/README.md` gains the fallback prerequisites (`initdb`/`pg_ctl` on `PATH`) and behavior; `AGENTS.md` database-test rules allow the fallback while keeping the existing guarantees (disposable database, fixtures only, `TEST_DATABASE_URL` only, `DATABASE_URL` unset, cleanup, no Docker requirement).

## Risks / Trade-offs

- [A server on a nonstandard port without `PGPORT` set] → the fallback substitutes a cluster instead of failing; the notice line makes the substitution visible, and tests remain isolated.
- [`kill -9` leaves a stray cluster directory or process] → every run uses a fresh directory and random port; the directory lives under `node_modules/.cache`, which `npm ci` clears, and the orphaned process holds no shared resource.
- [`initdb` refuses to run as root] → its own error is surfaced; the fallback is not intended for root CI runners, and the running-server path is unaffected.
- [Random port collision] → `pg_ctl start` failure triggers a retry with another port before the launcher reports failure.
- [Divergence from the documented 18.6] → the fallback uses the installed binaries exactly as the running-server path uses the installed server; the documentation continues to name 18.6 as expected.

## Migration Plan

No application or database migration. The change is confined to the test launcher and its documentation; rollback restores the previous launcher and docs. Existing application databases are never touched by either path because only disposable databases are created and dropped.
