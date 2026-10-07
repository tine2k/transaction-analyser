# Spec Delta

## MODIFIED Requirements

### Requirement: The API is a health endpoint, a read-only transactions endpoint, and a category management surface

The system SHALL expose a health endpoint at `/api/health`, which reports that the server is
running; a read-only transactions endpoint at `/api/transactions`, which returns stored
transactions as the `transaction-read-api` capability defines; a category management surface
at `/api/categories`, which lists, creates, changes, and deletes categories as the
`category-management-api` capability defines and re-evaluates stored transactions as the
`category-recategorisation` capability defines; a read-only import log at `/api/imports`,
which returns recent import runs as the `import-log` capability defines; and a sync-start
endpoint at `POST /api/easybank/sync`, which starts the Easybank sync as the `easybank-sync`
capability defines. The health endpoint
SHALL report on the server alone and SHALL NOT report on the database, so that a database which
is unreachable is never presented as the application being down. The system SHALL NOT expose any
further endpoint, SHALL NOT expose any endpoint other than the sync-start endpoint and the
category management surface's re-categorisation operation that can lead
to a transaction being created, changed, or deleted, SHALL start an import only through the
sync-start endpoint, and SHALL allow a category to be written
only through the category management surface. A request for a path under `/api` that no endpoint
matches SHALL be answered by the browser application rather than by an endpoint, SHALL NOT read
or write a row in the database, and SHALL NOT be reported as a missing resource.

#### Scenario: The health endpoint answers

- **WHEN** a request is made for the health endpoint
- **THEN** the server answers with a success status and a small body in a machine-readable form stating that the server is up

#### Scenario: Only the named endpoints exist

- **WHEN** a request is made for a path under `/api` other than the health endpoint, the transactions endpoint, the category management surface and its re-categorisation operation, the import log, and the sync-start endpoint
- **THEN** no API endpoint answers it and no row is read or written, and the request is answered by the browser application shell rather than reported as a missing resource

#### Scenario: The transactions endpoint reads stored data

- **WHEN** a `GET` request is made for the transactions endpoint
- **THEN** the server answers from the stored transactions as the `transaction-read-api` capability defines

#### Scenario: The import log endpoint reads the recorded runs

- **WHEN** a `GET` request is made for the import log endpoint
- **THEN** the server answers from the recorded import runs as the `import-log` capability defines, and reads no transaction

#### Scenario: The category surface writes a category

- **WHEN** a request that creates, changes, or deletes a category is made to the category management surface
- **THEN** the server applies it as the `category-management-api` capability defines, and this is the only API path that can write a category

#### Scenario: The re-categorisation operation re-evaluates transactions

- **WHEN** the re-categorisation operation is requested
- **THEN** the server re-evaluates the stored transactions as the `category-recategorisation` capability defines

#### Scenario: The sync endpoint starts the sync

- **WHEN** a `POST` request is made for the sync-start endpoint
- **THEN** the server starts the Easybank sync as the `easybank-sync` capability defines, through the same task and import path the scheduled sync uses

#### Scenario: No request can alter stored data

- **WHEN** a request using a method that creates, alters, or deletes is made to the transactions endpoint, the import log, or a page path
- **THEN** no endpoint acts on it, and no transaction row is created, altered, or deleted

#### Scenario: No request starts an import

- **WHEN** a request other than a `POST` to the sync-start endpoint is made to any path the application serves
- **THEN** no import is started by it

#### Scenario: A page path answers with the same document whatever method is used

- **WHEN** a request using a method that creates, alters, or deletes is made to a path that renders a page
- **THEN** the server answers with the same document it renders for a read, because no endpoint on a page path acts on the request, and so no row is created, altered, or deleted

#### Scenario: The health endpoint says nothing about the database

- **WHEN** the health endpoint is requested while the database is unreachable
- **THEN** the response is the same as when the database is reachable, because the endpoint reports on the server alone
