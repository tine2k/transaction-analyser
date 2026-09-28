# Proposal

## Why

The current UI suite depends on Playwright and a built server, runs serially, and has been slow and flaky. Replace it with a simpler, fast local test setup that gives unit and API/database integration coverage without browser automation.

## What Changes

- Remove Playwright tests, configuration, package dependency, and test scripts.
- Establish a lightweight test runner and clear local commands for unit and API/database integration tests.
- Use isolated PostgreSQL fixtures for integration tests and ensure test database/container cleanup after runs.
- Start a fresh test baseline around important server/domain behavior rather than porting every UI scenario.
- Keep CI configuration out of scope.

## Capabilities

### New Capabilities

None. This change concerns test tooling and verification practices, not product behavior.

### Modified Capabilities

None. Existing application requirements and user-visible behavior do not change.

## Impact

- `package.json` and `package-lock.json` test scripts and dependencies.
- Existing Playwright files under `tests/`, plus replacement unit and API/database integration tests and test support files.
- Local PostgreSQL test setup, fixture isolation, and documented test commands.
- No production API, application behavior, or CI workflow changes.
