# Container Image Specification

## Purpose

Defines the production container image as a single deployable unit for the browser application and its API, while keeping database provisioning and credentials outside the image and under operator control.

## Requirements

### Requirement: One production image serves the frontend and backend

The system SHALL provide a build that produces one runnable production image containing the application server and the browser assets it serves. When the image is run, one application process SHALL serve both the browser frontend and API from the same address and port. The image SHALL NOT require a separate frontend image, frontend service, or reverse proxy to join the two application halves.

#### Scenario: Build produces one runnable application image

- **WHEN** the project's container build is run
- **THEN** it produces one runnable image containing the production application server and browser assets

#### Scenario: Frontend and API share the running server

- **WHEN** the image is started and a browser page and API endpoint are requested
- **THEN** the same application process answers both on the same exposed port

#### Scenario: The configured port is reachable from outside the container

- **WHEN** the image is run with its application port published by the container runtime
- **THEN** the application accepts requests on that port and serves both the frontend and API

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
