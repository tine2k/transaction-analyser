# Spec Delta

## Purpose

Defines the production container image as a single deployable unit for the browser application and its API, while keeping database provisioning and credentials outside the image and under operator control.

## ADDED Requirements

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

### Requirement: Database configuration and preparation stay external to the image

The system SHALL NOT include or start a PostgreSQL server in the application image. The image SHALL obtain `DATABASE_URL` only from the running process environment, SHALL NOT contain a database address or credentials, and SHALL permit the same built image to be run against different operator-configured databases without rebuilding. Creation and schema preparation of the database, including applying the repository's SQL migrations, SHALL remain an explicit operator action outside the image.

#### Scenario: Database address is supplied at runtime

- **WHEN** the image is run with `DATABASE_URL` set by the operator
- **THEN** database-backed application requests use that address, and the value was not required during image build

#### Scenario: The same image can target another database

- **WHEN** the same built image is started with a different runtime `DATABASE_URL`
- **THEN** database-backed requests use the newly supplied address without rebuilding the image

#### Scenario: No database is bundled or started

- **WHEN** the application image is built and run
- **THEN** it contains and starts the application only, and PostgreSQL must be supplied and operated separately

#### Scenario: Database schema is prepared manually

- **WHEN** an operator prepares a database for the application
- **THEN** the operator applies the existing SQL migrations outside the image, and starting the image performs no schema or data migration

#### Scenario: Missing database configuration does not prevent the shell from starting

- **WHEN** the image is started without `DATABASE_URL`
- **THEN** it serves the browser application and health endpoint, and reports the missing configuration only when a database-backed operation is requested
