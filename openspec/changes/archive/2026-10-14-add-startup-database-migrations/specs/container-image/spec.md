# Spec Delta

## REMOVED Requirements

### Requirement: Database configuration and preparation stay external to the image

**Reason**: This requirement asserts that applying the repository's SQL migrations remains an explicit operator action outside the image, through the scenarios "Database schema is prepared manually" and "Missing database configuration does not prevent the shell from starting". The image now contains the migration files and applies pending migrations at startup, and a missing database address fails startup, so the requirement cannot be amended without keeping names and scenarios that assert the opposite of the new behaviour. It is replaced by ADDED requirements that keep database provisioning and credentials outside the image while moving schema preparation into the image's startup.

**Migration**: Operators no longer apply the SQL files by hand. A first start against a database whose schema already exists is adopted with `MIGRATE_BASELINE`, and provisioning the PostgreSQL server remains an operator action. No stored data changes.

## ADDED Requirements

### Requirement: Database provisioning stays external to the image

The system SHALL NOT include or start a PostgreSQL server in the application image. The image SHALL obtain `DATABASE_URL` only from the running process environment, SHALL NOT contain a database address or credentials, and SHALL permit the same built image to be run against different operator-configured databases without rebuilding. Provisioning the database remains an operator action.

#### Scenario: Database address is supplied at runtime

- **WHEN** the image is run with `DATABASE_URL` set by the operator
- **THEN** database-backed application requests use that address, and the value was not required during image build

#### Scenario: The same image can target another database

- **WHEN** the same built image is started with a different runtime `DATABASE_URL`
- **THEN** database-backed requests use the newly supplied address without rebuilding the image

#### Scenario: No database is bundled or started

- **WHEN** the application image is built and run
- **THEN** it contains and starts the application only, and PostgreSQL must be supplied and operated separately

### Requirement: The image contains and applies the pending migrations at startup

The image SHALL contain the repository's SQL migration files and SHALL apply the pending ones automatically when it starts, before the server serves any request, as the `database-migrations` capability defines. A database whose schema already exists is adopted through `MIGRATE_BASELINE` on its first start, and starting the image without a database address SHALL fail rather than serve.

#### Scenario: Pending migrations are applied when the image starts

- **WHEN** the image is started against a database missing migrations present in the image
- **THEN** the image applies them before serving, with no SQL applied by an operator outside the image

#### Scenario: The image contains the SQL it applies

- **WHEN** the image is built
- **THEN** it contains the repository's migration files, and no operator-supplied migration files are needed to prepare the schema

#### Scenario: An existing database is adopted on its first start

- **WHEN** the image is started once against a database that already has the schema and no migration history, with `MIGRATE_BASELINE` naming the version it has
- **THEN** the database is adopted, and later starts need no baseline variable

#### Scenario: Missing database configuration prevents the image from starting

- **WHEN** the image is started without `DATABASE_URL`
- **THEN** the process exits non-zero and serves nothing
