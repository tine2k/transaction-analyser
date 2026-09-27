# Spec Delta

## MODIFIED Requirements

### Requirement: The API is a health endpoint and a read-only transactions endpoint

The system SHALL expose exactly two API endpoints: a read-only health endpoint at `/api/health`, which reports that the server is running, and a read-only transactions endpoint at `/api/transactions`, which returns stored transactions as defined by the `transaction-read-api` capability. The system SHALL NOT expose any further endpoint beyond these two, and SHALL NOT expose any endpoint that accepts a request to create, alter, or delete stored data. The health endpoint SHALL report on the server alone and SHALL NOT report on the database, so that a database which is unreachable is never presented as the application being down. A request for a path under `/api` that no endpoint matches SHALL be answered by the browser application rather than by an endpoint, SHALL NOT read a row from the database, and SHALL NOT be reported as a missing resource.

#### Scenario: The health endpoint answers

- **WHEN** a request is made for the health endpoint
- **THEN** the server answers with a success status and a small body in a machine-readable form stating that the server is up

#### Scenario: Only the named endpoints exist

- **WHEN** a request is made for a path under `/api` other than the health endpoint and the transactions endpoint
- **THEN** no API endpoint answers it and no row is read from the database, and the request is answered by the browser application shell rather than reported as a missing resource

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
