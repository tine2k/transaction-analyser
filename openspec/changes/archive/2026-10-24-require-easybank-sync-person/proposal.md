# Proposal

## Why

The Easybank sync already imports into the person named by `EASYBANK_PERSON`, but an absent or empty
variable silently falls back to the seeded person `Default`. A deployment that forgets the variable
therefore keeps importing into whichever person happens to be called `Default` — or, after a rename,
records a failed run every night. The person a run writes to is a deliberate configuration, not
something the application should guess.

## What Changes

- Make `EASYBANK_PERSON` mandatory and remove the `Default` fallback. The name is still trimmed and
  resolved against stored people ignoring letter case, and the sync still never creates a person.
- **BREAKING**: the server SHALL fail startup with a non-zero exit and serve nothing when
  `EASYBANK_PERSON` is missing or empty, naming the variable in the failure message.
- **BREAKING**: the manual `npm run sync` command SHALL exit non-zero before logging in, reading the
  bank, or writing anything when `EASYBANK_PERSON` is missing or empty. `--help` still works.
- Keep an unknown person name as a recorded failed run, as today: the variable is mandatory, but its
  value still has to name an existing person.
- Update `.env.example`, `README.md`, `docs/container-image.md`, and the sync command's usage text so
  every startup example and local-development instruction includes `EASYBANK_PERSON`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `easybank-sync`: `EASYBANK_PERSON` becomes required; the `Default` fallback and its scenarios are
  replaced by startup and command-line refusal scenarios.

## Impact

- `shared/easybank-sync.ts`: `personFromEnv` no longer defaults; `DEFAULT_PERSON` and the internal
  fallback in `syncEasybank` are removed; a helper for the required value is added.
- New server startup check (a Nitro plugin, next to the migrations plugin) that exits non-zero when
  the variable is missing or empty.
- `tools/easybank-sync.ts` and `server/tasks/easybank/sync.ts` read the required person.
- Tests: unit expectations for the fallback change; integration server spawns and
  `playwright.config.ts` must supply `EASYBANK_PERSON`; a new startup-refusal test.
- Deployment: existing installations must set `EASYBANK_PERSON` before upgrading, including the
  quick-start `docker run` command. Local `npm run dev` and browser tests need it too.
- No database migration and no API shape change.
