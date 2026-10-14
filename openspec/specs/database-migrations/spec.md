# database-migrations Specification

## Purpose

Applies the repository's plain SQL migration files automatically at application startup and keeps a recorded history of what has been applied, so a database's schema state is never left to an operator's memory.

## Requirements

### Requirement: Pending migrations are applied at startup before the server serves

The system SHALL apply every pending migration from the repository's migration directory to the configured database while the application starts, in filename order, and SHALL answer a request only after the pending migrations have been applied or the start has failed.

#### Scenario: Pending migrations are applied at startup

- **WHEN** the application starts against a database that is missing one or more migrations present in the repository
- **THEN** every missing migration is applied before the server answers its first request

#### Scenario: An up-to-date database starts without applying anything

- **WHEN** the application starts against a database whose history records every migration present in the repository
- **THEN** no migration is executed and the server serves as usual

#### Scenario: A request is not answered before the migrations finish

- **WHEN** the application is started with pending migrations and a request arrives while they are being applied
- **THEN** the request is not answered until the migration run has finished or the start has failed

### Requirement: A missing database address fails startup

The system SHALL exit with a non-zero status and serve no request when `DATABASE_URL` is missing or empty, and the failure message SHALL name the missing variable without including an address or a credential.

#### Scenario: Startup without an address

- **WHEN** the application is started with no `DATABASE_URL` in the environment
- **THEN** the process exits non-zero, no port is served, and the message names the missing variable

#### Scenario: Startup with an empty address

- **WHEN** the application is started with `DATABASE_URL` set to an empty value
- **THEN** the process exits non-zero and serves no request

### Requirement: A migration failure fails startup

The system SHALL exit with a non-zero status and serve no request when a pending migration cannot be applied, including when the database is unreachable or a migration's SQL fails. A migration that fails SHALL leave neither its changes nor a history entry recording it.

#### Scenario: The database is unreachable

- **WHEN** the application starts with a configured address that nothing answers
- **THEN** the process exits non-zero and serves no request

#### Scenario: A migration's SQL fails

- **WHEN** a pending migration contains a statement the database rejects
- **THEN** the process exits non-zero, that migration's changes are absent, and its history entry is absent

#### Scenario: A completed migration is kept when a later one fails

- **WHEN** two pending migrations are applied in order and the second fails
- **THEN** the first is recorded and kept, and a restart retries the failed migration and the migrations after it

### Requirement: The history table records what has been applied

The system SHALL record every applied migration in a history table named `pgmigrations`, at least by its name and the time it was applied, and SHALL treat a migration recorded there as applied and not pending.

#### Scenario: Each applied migration leaves a history row

- **WHEN** a migration is applied
- **THEN** the history table contains exactly one row naming it, with the time it completed

#### Scenario: A recorded migration is not applied again

- **WHEN** the application restarts and the history records a migration
- **THEN** that migration's SQL is not executed again

#### Scenario: The history shows a database's migration state

- **WHEN** an operator reads the history table
- **THEN** the migrations the database has applied are listed for inspection

### Requirement: An existing database is adopted through MIGRATE_BASELINE

The system SHALL adopt a database that already holds a schema but has no history through the `MIGRATE_BASELINE` environment variable: the local migration files up to and including the named version SHALL be recorded as applied without being executed, and files after it SHALL be applied normally. The variable SHALL have no effect when history already exists or when the database has no schema.

#### Scenario: A hand-migrated database is adopted on first start

- **WHEN** the application starts against a database whose schema exists, whose history is empty, with `MIGRATE_BASELINE` naming the version the database already has
- **THEN** the files up to that version are recorded without running, later files are applied, and no earlier migration's SQL is executed

#### Scenario: The variable is ignored once a history exists

- **WHEN** `MIGRATE_BASELINE` is set and the history table already records migrations
- **THEN** the variable has no effect on the run

#### Scenario: The variable is ignored on an empty database

- **WHEN** `MIGRATE_BASELINE` is set and the database holds no schema and no history
- **THEN** every migration is applied normally as if the variable were unset

#### Scenario: An unadopted database without the variable fails startup

- **WHEN** the application starts against a database whose schema exists, whose history is empty, without `MIGRATE_BASELINE`
- **THEN** the process exits non-zero, no migration is executed, and the message names the variable to set

#### Scenario: A baseline naming no local file fails startup

- **WHEN** `MIGRATE_BASELINE` names a version that matches no migration file in the repository
- **THEN** the process exits non-zero and no migration is recorded or executed

### Requirement: Migrations are ordered and runs are locked apart

The system SHALL apply pending migrations in ascending filename order, SHALL refuse to run a migration whose name sorts before an already-recorded migration, and SHALL hold a database-level lock so that two servers starting at once do not both apply the same migrations.

#### Scenario: Files are applied in filename order

- **WHEN** several migrations are pending
- **THEN** they are applied in ascending filename order

#### Scenario: A late-arriving older migration is refused

- **WHEN** a migration file whose name sorts before an already-recorded migration appears
- **THEN** the run fails before applying it, and the process exits non-zero

#### Scenario: Two starts do not race

- **WHEN** two application processes start against the same database at the same time with pending migrations
- **THEN** one waits for the other's lock, the migrations are applied once, and both starts then continue

### Requirement: Application is forward-only

The system SHALL apply migrations only forward: it SHALL NOT revert, roll back, or execute a down migration while starting or serving.

#### Scenario: No migration is reverted at startup

- **WHEN** the application starts against a migrated database
- **THEN** no migration is reverted and no down action is executed

#### Scenario: No down migrations are needed to start

- **WHEN** the repository contains up migration files only
- **THEN** startup applies the pending files and never asks for a down migration

### Requirement: Migration files stay the source of truth

The system SHALL keep migrations as plain SQL files in the repository under `db/migrations/`, named with a zero-padded number and a description, and SHALL apply each file's SQL as written without editing, renaming, or generating migration files.

#### Scenario: Existing migration files run unchanged

- **WHEN** the application starts against a database missing the migrations already in the repository
- **THEN** those files are applied as written, with no file edited or renamed first

#### Scenario: A schema change arrives as a new file

- **WHEN** a schema change is needed
- **THEN** it arrives as a new numbered SQL file in `db/migrations/` and is applied at the next start, with no application code change

#### Scenario: No run modifies a migration file

- **WHEN** a migration run finishes
- **THEN** every migration file in the repository is unchanged
