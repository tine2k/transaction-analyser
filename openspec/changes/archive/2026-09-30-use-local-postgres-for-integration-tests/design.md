# Design

## Context

See proposal.md for the motivation and scope. Today, `tests/run-with-test-database.sh` starts a PostgreSQL 17 Docker container, applies `db/migrations/*.sql`, loads `tests/fixtures/integration.sql`, removes inherited `DATABASE_URL`, exports `TEST_DATABASE_URL`, and removes the container with an exit trap. `tests/integration/api.test.ts` connects to that URL, while `package.json` routes `test:integration` through the launcher. The current test README and `AGENTS.md` describe Docker as a requirement.

The local PostgreSQL server must already be running. The launcher needs local PostgreSQL client utilities and a role that can create and drop databases. The existing repository migration and fixture sequence remains the source of test schema and data.

## Goals / Non-Goals

**Goals:**

- Keep integration runs isolated in a uniquely named, temporary database on the local PostgreSQL server.
- Preserve the existing build, migration, fixture, `TEST_DATABASE_URL`, and cleanup lifecycle.
- Fail early with actionable guidance if the local server is unavailable or the role lacks required privileges.
- Keep application-configured database credentials out of the integration-test process.

**Non-Goals:**

- Starting, installing, or configuring the PostgreSQL server as part of the test command.
- Using a pre-created or application database for test data.
- Changing application runtime database behavior or integration test assertions.

## Decisions

### Use the local server's PostgreSQL client configuration

Have the launcher check local server readiness, then create a uniquely named database using the installed PostgreSQL client tools and the developer's local connection configuration. Apply migrations and fixtures to that database, construct its test connection for `TEST_DATABASE_URL`, and drop it from the existing exit/signal cleanup path. Keep test commands using the wrapper so direct integration-suite execution still fails with a clear instruction.

This retains automatic setup and cleanup without Docker. Using a pre-created database supplied by the developer would avoid creation privileges, but would move setup to each developer and make reliable cleanup/isolation less enforceable; the user selected the automated disposable-database approach.

### Preserve environment isolation

Continue to remove inherited `DATABASE_URL` before starting the integration test command and provide only the temporary database as `TEST_DATABASE_URL`; the spawned application continues to receive that test URL as its database URL. Do not log the connection string. Keep the test database name unique per run to avoid colliding with existing databases or concurrent test runs.

### Align repository instructions with the implementation

Update `tests/README.md` and the PostgreSQL-test section of `AGENTS.md` to require a running local PostgreSQL server, local client tools, and create/drop privileges; explain that the suite creates a disposable database and only loads test fixtures. Remove statements that Docker is required for this suite. Keep unrelated Docker development instructions unchanged.

## Risks / Trade-offs

- [Local PostgreSQL is stopped or unreachable] → Check readiness before database creation and report that the service must be started, with the relevant local test command/documentation.
- [The configured role lacks create/drop privileges] → Fail before running tests with a clear privilege requirement; document the prerequisite.
- [A process or machine terminates before cleanup] → Use shell traps for normal exits and handled signals, and use a distinctive test-only database prefix so any orphan can be identified and removed manually.
- [Local PostgreSQL version differs from the existing PostgreSQL 17 container] → Document PostgreSQL 18.6 as the expected local version to keep test behavior consistent with the current harness.

## Migration Plan

No application or database migration is needed. Replace the container lifecycle with local disposable-database lifecycle, update the test launcher/package wiring as needed, and revise the integration-test documentation and agent guidance. Rollback by restoring the Docker-based launcher and its matching documentation. Existing application databases are not modified by either path.
