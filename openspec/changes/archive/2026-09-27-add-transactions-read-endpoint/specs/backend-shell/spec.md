# Spec Delta

## REMOVED Requirements

### Requirement: The API is a single health endpoint and reaches no stored data

**Reason**: This change adds a read-only transactions endpoint at `/api/transactions`, which the removed requirement forbids outright. The requirement cannot be amended by widening one sentence without keeping a name and scenarios that assert the opposite of the new behaviour, so it is replaced by an ADDED requirement that states the new API surface in full.

**Migration**: No code migrates from this requirement. A consumer that relied on every `/api` path other than `/api/health` returning no stored data must now account for `/api/transactions` returning stored transactions. The prohibition on endpoints that create, alter, or delete stored data is carried forward unchanged in the replacement requirement.

## MODIFIED Requirements

### Requirement: One shared connection pool, opened only when it is used

The system SHALL hold one shared database connection pool per server process, built from the configured address, and every consumer of the database SHALL obtain that same pool rather than opening a connection of its own. The system SHALL NOT open a connection while the server starts, while a page is rendered, or while a request is answered; a connection SHALL be established only when a statement is run through the pool. The system SHALL release the pool's connections when the server shuts down. The shell alone — the pages and the health endpoint — SHALL run no statement, so the pool is opened only when a statement is run through it, which only the transactions read endpoint does.

#### Scenario: Starting opens no connection

- **WHEN** the server starts with no database reachable
- **THEN** it starts, opens no connection, and reports no database failure

#### Scenario: Serving opens no connection

- **WHEN** a page is rendered and the health endpoint is requested
- **THEN** neither establishes a connection to the database

#### Scenario: The pool is shared rather than duplicated

- **WHEN** two consumers ask the server for the database
- **THEN** both are given the same pool, and neither opens a connection of its own

#### Scenario: A statement is what opens a connection

- **WHEN** a statement is run through the pool
- **THEN** a connection is established at that point and at no earlier one

#### Scenario: Shutdown releases the pool

- **WHEN** the server is stopped
- **THEN** the pool's connections are closed rather than left open

#### Scenario: The shell runs no statement

- **WHEN** the application runs with the shell alone, without the transactions endpoint being requested
- **THEN** no statement is sent to the database and the pool has opened no connection

#### Scenario: The read endpoint is the only statement the application runs

- **WHEN** the transactions endpoint is requested
- **THEN** it runs its read through the shared pool, and no other part of the application — the pages or the health endpoint — runs a statement of its own

## ADDED Requirements

### Requirement: The API is a health endpoint and a read-only transactions endpoint

The system SHALL expose exactly two API endpoints: a read-only health endpoint at `/api/health`, which reports that the server is running, and a read-only transactions endpoint at `/api/transactions`, which returns stored transactions as defined by the `transaction-read-api` capability. The system SHALL NOT expose any further endpoint beyond these two, and SHALL NOT expose any endpoint that accepts a request to create, alter, or delete stored data. The health endpoint SHALL report on the server alone and SHALL NOT report on the database, so that a database which is unreachable is never presented as the application being down.

#### Scenario: The health endpoint answers

- **WHEN** a request is made for the health endpoint
- **THEN** the server answers with a success status and a small body in a machine-readable form stating that the server is up

#### Scenario: Only the named endpoints exist

- **WHEN** a request is made for a path under `/api` other than the health endpoint and the transactions endpoint
- **THEN** the server reports that no such resource exists, and no row is read from the database

#### Scenario: The transactions endpoint reads stored data

- **WHEN** a `GET` request is made for the transactions endpoint
- **THEN** the server answers from the stored transactions as the `transaction-read-api` capability defines, and this is the only API path at which a row is read

#### Scenario: No request can alter stored data

- **WHEN** a request using a method that creates, alters, or deletes is made to any path under `/api`
- **THEN** no endpoint answers it, and no row is created, altered, or deleted

#### Scenario: A page path answers with the same document whatever method is used

- **WHEN** a request using a method that creates, alters, or deletes is made to a path that renders a page
- **THEN** the server answers with the same document it renders for a read, because no endpoint exists that could act on the request and the application holds no statement that writes, and so no row is created, altered, or deleted

#### Scenario: The health endpoint says nothing about the database

- **WHEN** the health endpoint is requested while the database is unreachable
- **THEN** the response is the same as when the database is reachable, because the endpoint reports on the server alone
