# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: The API is a health endpoint and a read-only transactions endpoint`
- TO: `### Requirement: The API is a health endpoint, a read-only transactions endpoint, and a category management surface`

## MODIFIED Requirements

### Requirement: The API is a health endpoint, a read-only transactions endpoint, and a category management surface

The system SHALL expose a health endpoint at `/api/health`, which reports that the server is
running; a read-only transactions endpoint at `/api/transactions`, which returns stored
transactions as the `transaction-read-api` capability defines; and a category management surface
at `/api/categories`, which lists, creates, changes, and deletes categories as the
`category-management-api` capability defines. The health endpoint SHALL report on the server
alone and SHALL NOT report on the database, so that a database which is unreachable is never
presented as the application being down. The system SHALL NOT expose any further endpoint, SHALL
NOT expose any endpoint that creates, changes, or deletes a transaction, and SHALL allow a
category to be written only through the category management surface. A request for a path under
`/api` that no endpoint matches SHALL be answered by the browser application rather than by an
endpoint, SHALL NOT read or write a row in the database, and SHALL NOT be reported as a missing
resource.

#### Scenario: The health endpoint answers

- **WHEN** a request is made for the health endpoint
- **THEN** the server answers with a success status and a small body in a machine-readable form stating that the server is up

#### Scenario: Only the named endpoints exist

- **WHEN** a request is made for a path under `/api` other than the health endpoint, the transactions endpoint, and the category management surface
- **THEN** no API endpoint answers it and no row is read or written, and the request is answered by the browser application shell rather than reported as a missing resource

#### Scenario: The transactions endpoint reads stored data

- **WHEN** a `GET` request is made for the transactions endpoint
- **THEN** the server answers from the stored transactions as the `transaction-read-api` capability defines

#### Scenario: The category surface writes a category

- **WHEN** a request that creates, changes, or deletes a category is made to the category management surface
- **THEN** the server applies it as the `category-management-api` capability defines, and this is the only API path that can write a category

#### Scenario: No request can alter stored data

- **WHEN** a request using a method that creates, alters, or deletes is made to the transactions endpoint or to a page path
- **THEN** no endpoint acts on it, and no transaction row is created, altered, or deleted

#### Scenario: A page path answers with the same document whatever method is used

- **WHEN** a request using a method that creates, alters, or deletes is made to a path that renders a page
- **THEN** the server answers with the same document it renders for a read, because no endpoint on a page path acts on the request, and so no row is created, altered, or deleted

#### Scenario: The health endpoint says nothing about the database

- **WHEN** the health endpoint is requested while the database is unreachable
- **THEN** the response is the same as when the database is reachable, because the endpoint reports on the server alone

### Requirement: One shared connection pool, opened only when it is used

The system SHALL hold one shared database connection pool per server process, built from the
configured address, and every consumer of the database SHALL obtain that same pool rather than
opening a connection of its own. The system SHALL NOT open a connection while the server starts,
while a page is rendered, or while a request is answered; a connection SHALL be established only
when a statement is run through the pool. The system SHALL release the pool's connections when
the server shuts down. The pages and the health endpoint SHALL run no statement, so the pool is
opened only when a statement is run through it, which the transactions read endpoint and the
category management surface do.

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

- **WHEN** the application runs with the shell alone, without the transactions endpoint or the category management surface being requested
- **THEN** no statement is sent to the database and the pool has opened no connection

#### Scenario: The read endpoint is the only statement the application runs

- **WHEN** the transactions endpoint is requested
- **THEN** it runs its read through the shared pool, and no other part of the application — the pages or the health endpoint — runs a statement of its own

#### Scenario: The category surface runs its statement through the same pool

- **WHEN** a category management request is made
- **THEN** it runs its statement through the same shared pool, and no page or the health endpoint runs a statement of its own
