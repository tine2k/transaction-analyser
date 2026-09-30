# Proposal

## Why

The API integration suite currently depends on Docker to start PostgreSQL, which prevents running it in environments where PostgreSQL is installed locally but Docker is unavailable. Use the local PostgreSQL installation while keeping test data isolated from application and real transaction databases.

## What Changes

- Replace the Docker-based integration-test launcher with a launcher that creates a uniquely named disposable database on the locally installed PostgreSQL server, applies repository migrations, loads only integration fixtures, and drops the database on success, failure, or interruption.
- Keep the integration suite connected only through `TEST_DATABASE_URL` and prevent inherited application `DATABASE_URL` settings from reaching test processes.
- Document the local PostgreSQL requirements, database-creation privileges, and test command; align the repository's database-test guidance with the new local setup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change affects test tooling and its operating instructions, not application requirements; the change opts out of spec deltas.

## Impact

- `tests/run-with-test-database.sh` and the `test:integration` package script.
- Integration test environment validation in `tests/integration/api.test.ts`.
- `tests/README.md` and `AGENTS.md` database-test instructions.
- Requires a running local PostgreSQL installation and a role able to create and drop databases; Docker is no longer required for the integration suite.
