# Tasks

## 1. Test runner and fast test foundation

- [x] 1.1 Add Vitest and the Nuxt/Vue test utilities, configure the unit and component environments, and define `test`, `test:unit`, and component-suite scripts; verify dependency installation and configuration discovery succeed.
- [x] 1.2 Add representative server/domain unit tests and Vue component tests for selected state and interaction behavior; verify the fast test command passes without Docker or a production build.
- [x] 1.3 Document the runner choice, suite boundaries, and local fast-test command; verify each documented command matches the package scripts.

## 2. Disposable PostgreSQL and API integration suite

- [x] 2.1 Add a local integration launcher that starts a uniquely named PostgreSQL container with no persistent volume and loopback-only port publishing, waits for readiness, exports `TEST_DATABASE_URL`, and guarantees cleanup on success, failure, or interruption; verify teardown with both passing and intentionally failing test runs.
- [x] 2.2 Apply the existing SQL migrations in order and seed deterministic fixtures only; verify the test schema is isolated and no configured application database is accessed.
- [x] 2.3 Add API integration tests against one built Nuxt server process using the disposable database; verify selected success, validation/error, persistence, and read-only behaviors via HTTP.
- [x] 2.4 Add the integration script and document Docker prerequisites, environment safety, and commands; verify a local integration run succeeds and leaves no test container running.

## 3. Remove Playwright and validate the complete setup

- [x] 3.1 Remove the Playwright specs, configuration, dependency, and package scripts, and update the lockfile; verify no active Playwright tests/config/scripts or installed Playwright packages remain (optional peer metadata from test tooling is acceptable).
- [x] 3.2 Run the fast suite without Docker and the full local suite with Docker; verify both pass, integration cleanup occurs, and existing untracked test-output directories are not removed by the test setup.
