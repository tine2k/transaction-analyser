# Proposal

## Why

The test launcher requires a reachable local PostgreSQL server, so the integration and browser suites cannot run in environments where no server is running and Docker is unavailable. The PostgreSQL binaries are installed there, but nothing provisions a server from them.

## What Changes

- Extend `tests/run-with-test-database.sh`: when `pg_isready` fails and no explicit server-selecting environment (`PGHOST`, `PGPORT`, `PGHOSTADDR`) is set, initialize a disposable PostgreSQL cluster from the installed `initdb` and `pg_ctl` binaries, start it on loopback TCP with a random port, and use it for the existing disposable-database lifecycle. Explicit connection settings still win: with them set, the launcher fails as today.
- Require `initdb` and `pg_ctl` only on the fallback path, so client-only installations continue to work against a running server.
- Stop the cluster and remove its scratch directory in the existing cleanup trap, after the disposable database is dropped.
- Document the fallback and its prerequisites in `tests/README.md`, and allow it in the database-test rules of `AGENTS.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change affects test tooling and its operating instructions, not application requirements; `.openspec.yaml` sets `skip_specs: true`.

## Impact

- `tests/run-with-test-database.sh` (fallback path and cleanup), `tests/README.md`, `AGENTS.md`, `.openspec.yaml`.
- No application code, API, database schema, or dependency changes; the fallback uses the same locally installed PostgreSQL binaries the suite already documents.
