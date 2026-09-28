# Design

## Context

See proposal.md for the motivation and scope. The project is Node 24+, TypeScript, and Nuxt 4. `tests/` currently has three Playwright browser specs, a Playwright config that serially launches the built Nuxt server, and one `node:test` integration test that imports TypeScript directly and optionally starts that same built server. There is no established unit/component test runner. PostgreSQL-backed tests must use a disposable Docker database, bound to loopback, seeded only with fixtures, and removed after the run.

## Goals / Non-Goals

**Goals:**
- Provide a quick unit/component feedback path and a repeatable API/database integration path.
- Cover selected Vue component behavior without launching a real browser.
- Make the full local run self-contained, deterministic, and safe from real transaction data.

**Non-Goals:**
- Browser automation, visual checks, or end-to-end user journeys.
- CI configuration or changes to production behavior and API contracts.
- Porting every assertion from the existing UI suite.

## Decisions

### Use Vitest with Nuxt/Vue test utilities as the single test runner

Adopt Vitest and the Nuxt test utilities for unit and Vue component tests. The component suite will mount selected SFCs in the supported simulated DOM environment; it will not launch Chromium or another browser. Keep unit tests focused on isolated domain/server logic and use the Nuxt utilities only where framework behavior or component mounting is relevant.

The built-in `node:test` runner is already used and would remain a good minimal choice for server-only tests, but it does not provide the Vue SFC transforms, Nuxt auto-import/runtime support, or component mounting needed by the agreed scope. Maintaining both runners would add separate conventions and commands. Playwright is not replaced by another browser automation framework because browser tests are explicitly out of scope.

### Separate fast tests from real API/database integration tests

Organize the suites by responsibility (unit, component, and integration). Unit/component tests must not need PostgreSQL, a Nuxt production build, or Docker. API integration tests should exercise the built Nuxt server over loopback HTTP against real PostgreSQL, while keeping one server process for the suite rather than starting one per test. Build once for that integration run; keep it out of the fast test path.

Use a single conventional full-suite command plus explicit unit/component and integration commands. The full local command runs the fast suite and then the integration suite; document that Docker is required for the latter.

### Provision a disposable PostgreSQL database for integration runs

An integration-test launcher should create a uniquely named, non-persistent PostgreSQL container, publish its port only on `127.0.0.1`, wait for readiness, and pass its connection string as `TEST_DATABASE_URL`. Apply the repository's migrations in order, then load deterministic test fixtures only. Ensure teardown runs on both success and failure, closes the application/database processes, and removes the container. Tests must not use `DATABASE_URL` or any configured application database as their fixture store.

### Establish a fresh behavior-focused baseline

Create tests around important server/domain invariants, the HTTP API contract, persistence and error paths, and selected component behavior (including async/loading/error states where they are consequential). Prefer deterministic assertions and controlled clocks/timers over wall-clock sleeps. Do not treat the former browser specs as a checklist to port; retain only behaviors that provide meaningful value at these test layers.

## Risks / Trade-offs

- **Vitest/Nuxt setup can add dependency and configuration weight** → Keep one runner, scope Nuxt mounting to component tests, and avoid browser binaries or E2E packages.
- **A real PostgreSQL integration suite is slower and requires Docker** → Keep a fast no-Docker command; make the full integration path one-command and provide actionable startup failures.
- **A built-server test can be coupled to generated output** → Build explicitly before integration tests, use an ephemeral loopback port, wait for the health endpoint with a bounded timeout, and always terminate the server.
- **A fresh baseline may omit edge cases covered by current UI specs** → Select API/component assertions from existing product contracts and record coverage gaps rather than recreating browser journeys.

## Migration Plan

1. Add the Vitest/Nuxt test configuration, suite layout, and local commands; establish unit and component examples.
2. Add the isolated PostgreSQL launcher, migrations/fixture setup, and API integration coverage.
3. Remove the Playwright specs, configuration, dependency, and related package scripts; update the lockfile and local test documentation.
4. Verify the fast suite works without Docker and the full suite provisions and cleans up its disposable database on both pass and failure.

Rollback, if needed, is to restore the Playwright test files and dependency/scripts from version control. No production data or schema migration is involved.
