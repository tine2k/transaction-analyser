# Proposal

## Why

The nightly Easybank sync imports transactions unattended, and the Imports screen is only seen when someone opens the app. When a sync writes transactions that no stored category matches, nothing tells anyone, so those transactions can sit uncategorised until someone happens to look. A Pushover notification after a sync that added uncategorised transactions closes that gap.

## What Changes

- After a sync run that wrote at least one new transaction, when at least one of those written transactions received no category, the system sends a Pushover notification carrying a summary of the run.
- The notification covers every sync path — the nightly scheduled run, the manual `npm run sync` command, and the sync started from the Imports screen — because they share one sync path. The manual CSV import does not notify.
- Pushover credentials come from the environment. When they are absent, no notification is sent and the sync is not a failed one.
- A notification failure never affects the import: the run's outcome and its record are unchanged, and the failure is logged only.
- No database schema change and no new API endpoint.

## Capabilities

### New Capabilities
- `import-notification`: notifying via Pushover after a sync imports new transactions of which at least one carries no category.

### Modified Capabilities

None.

## Impact

- `shared/easybank-sync.ts` — triggers the notification after the run record is finished.
- A new framework-free notification module under `shared/` — builds the message and calls the Pushover API.
- `README.md` — documents the `PUSHOVER_TOKEN` and `PUSHOVER_USER` environment variables.
- Tests — unit tests for the message and trigger rule, integration tests against a fake Pushover server through an injected `fetch`, following the existing fake-bank pattern.
