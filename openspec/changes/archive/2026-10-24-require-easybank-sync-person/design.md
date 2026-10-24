# Design

## Context

`EASYBANK_PERSON` is already read by `personFromEnv` in `shared/easybank-sync.ts`, and every sync
entry point — the nightly Nitro task, the screen-started task, and `tools/easybank-sync.ts` — passes
its result to `syncEasybank`. The current fallback to `Default` lives in two places: `personFromEnv`
and `syncEasybank`'s internal `configuredPerson` expression.

`server/plugins/database-migrations.ts` establishes the project's startup-failure pattern: it awaits
work at module scope, logs the reason, and calls `process.exit(1)`, so Nitro never serves a request.
`server/utils/migrations.ts` names the missing variable in its message and never prints an address or
credential. See `proposal.md` — Why for the motivation and the delta spec for the requirements.

## Goals / Non-Goals

**Goals:**

- One definition of a usable sync person, shared by startup, the task, and the command.
- A missing or blank `EASYBANK_PERSON` stops the server before it serves and stops the command before
  it touches the bank or the database.
- The `Default` fallback disappears from both the environment reader and `syncEasybank`.
- Existing behavior for an existing-but-unknown person is unchanged: a recorded failed run, no
  transaction written, no person created.

**Non-Goals:**

- Validating that the named person exists at startup. The database check would move a domain
  resolution into process startup, delay readiness on the people table, and duplicate the run's
  existing resolution. An unknown name keeps failing the run, as it does today.
- Requiring `EASYBANK_USER` or `EASYBANK_PIN` at startup. Absent credentials remain an unconfigured
  sync that records nothing.
- A new variable name or a per-run `--person` flag; the existing variable becomes required.

## Decisions

### D1: `personFromEnv` returns `string | null`, with a throwing wrapper for entry points

`personFromEnv` keeps its role of reading and trimming the environment but returns `null` for absent,
empty, or whitespace-only values. A new `requirePersonFromEnv` throws
`EASYBANK_PERSON is not set: set it to the name of an existing person before starting the application`.
Keeping the parsing and the refusal separate lets the command and the plugin share one message and
lets unit tests cover both without process exits.

*Alternative considered:* keep returning `Default` and check the raw environment separately in each
entry point. Rejected: the fallback would remain a default that can leak back in, and the message
would be duplicated.

### D2: A dedicated Nitro plugin enforces the startup requirement

Add `server/plugins/easybank-person.ts`, evaluated at module scope like the migrations plugin: read
the environment, log `[config] <message>` and `process.exit(1)` when `requirePersonFromEnv` throws.
Nitro imports plugin modules before creating the application, so this happens before the port is
bound. *Alternative considered:* extending `database-migrations.ts`; rejected because it would mix a
sync configuration concern into the migration startup path.

Plugin modules load in filename order, so `database-migrations.ts` runs first. With neither
`DATABASE_URL` nor `EASYBANK_PERSON` set, the database failure is reported first. With a usable
database, a missing person is reported next. The spec scenario therefore requires a usable database to
observe the person failure.

### D3: The command checks after `--help` and before the database check

`tools/easybank-sync.ts` keeps `--help`/`-h` as the first exit so usage stays available without
configuration. It then calls `requirePersonFromEnv` before resolving `--dsn`/`DATABASE_URL` and before
opening a client, so a missing person always names that variable and no connection is attempted.
Logging in and reading the bank only happen after `syncEasybank` is called, which this check
precedes.

*Alternative considered:* checking only inside `syncEasybank`. Rejected: the command would connect to
the database first, and the requirement is to refuse before opening it.

### D4: `syncEasybank` loses its fallback

`EasybankSyncOptions.person` stays a `string`. The `DEFAULT_PERSON` export and the
`configuredPerson` ternary are removed; `resolvePerson(database, options.person)` already trims and
throws for an empty name, which `syncEasybank` records as a failed run. Callers that bypass the entry
points (tests) therefore get an explicit failure instead of a silent `Default`.

*Alternative considered:* making `person` optional and returning `unconfigured`. Rejected: an
unconfigured sync is reserved for absent credentials and records no run; a missing person is a
configuration error that should be visible.

### D5: Tests supply the variable explicitly

The spawned-server integration tests and `playwright.config.ts` currently start the server with only
`DATABASE_URL`. Each spawn environment gains `EASYBANK_PERSON`, defaulting to `Default`, which the
integration fixture and the people migration seed. The startup-refusal test spawns the built server
with a usable disposable database and with `EASYBANK_PERSON` removed, asserting exit code 1, no
served request, and the variable named in the output. Unit tests replace the fallback expectations
with `null` and add the throwing-wrapper cases. A command test spawns
`node tools/easybank-sync.ts` to cover refusal and `--help` without a database.

*Alternative considered:* exporting the variable from `tests/run-with-test-database.sh`. Rejected: it
would hide the prerequisite from the spawn helpers, which are the places that actually construct the
server environment, and browser tests do not read that launcher's exports through
`playwright.config.ts`'s `env` block.

### D6: Documentation treats the variable as a startup prerequisite

`.env.example` moves `EASYBANK_PERSON` beside `DATABASE_URL` as required. `README.md` adds it to the
quick-start `docker run` (`EASYBANK_PERSON=Default` works on a fresh database), the local development
note, and the sync section. `docs/container-image.md` adds `--env EASYBANK_PERSON` to its run
examples and its startup-failure paragraph. The command's usage text states the variable is required.

## Risks / Trade-offs

- **Existing deployments stop starting until the variable is added** → The failure names the variable,
  the upgrade notes and quick start are updated, and the migration plan below tells operators to read
  the current person name first.
- **CSV-only installations must configure an Easybank setting** → Accepted consequence of refusing to
  start; `EASYBANK_USER`/`EASYBANK_PIN` still keep the sync inactive, so the variable only selects a
  destination that is never used.
- **A rename still breaks the nightly sync** → Unchanged and loud: the run is recorded as failed and
  the message names the missing person. Startup does not resolve the name, so a rename after startup
  remains a run failure rather than a restart.
- **Test fixtures that assume the fallback** → The two integration tests that passed `person: ''` are
  rewritten to expect a refused/failed run, and every server spawn sets the variable.
- **Alphabetical plugin order hides the person error when the database is also unset** → Accepted;
  both are startup failures and the first reported prerequisite is corrected before the next appears.

## Migration Plan

1. Before upgrading, read the person name on the People screen and set `EASYBANK_PERSON` to it; a
   fresh installation can use `Default` until the person is renamed.
2. Deploy the new image with `EASYBANK_PERSON` in the environment. No database migration runs.
3. Rollback: restore the previous image. The variable becomes optional again; leaving it set is
   harmless because the previous code treats a non-empty value the same way.
