# Spec Delta

## REMOVED Requirements

### Requirement: The only route is the index route, and it holds placeholder text

**Reason**: The index route is no longer placeholder text. It becomes the transactions table, so a requirement whose whole content is "the page carries no stored data and no data operation" is replaced by one that states what the route now presents.

**Migration**: The route's identity as the single index route, its rendering inside the one default layout, and the prohibition on inventing data are carried forward by the added requirement `The only route is the index route, and it presents the transactions table`. Consumers that relied on the index route showing no stored data are served by the `transaction-table` capability, which defines exactly which stored data appears and forbids writes.

## MODIFIED Requirements

### Requirement: The shell performs no domain work

The system SHALL NOT compute, derive, aggregate, or infer any value about a transaction or a category, and SHALL NOT evaluate any category's regular expression. The system SHALL NOT create, alter, or delete any stored data. The shell's only relationship to stored data is the single read request the transactions table makes to the read-only transactions endpoint; the shell SHALL NOT run a statement against the database, and the values it presents SHALL be exactly those the endpoint returned, unchanged. The shell SHALL NOT total, average, count, group, or otherwise derive a value from the returned transactions for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated anywhere, and no transaction is assigned a category

#### Scenario: Nothing is derived from stored data

- **WHEN** the index route is rendered
- **THEN** no total, count, balance, grouping, or other derived value of stored data is computed for display, and only the values the read endpoint returned are shown

#### Scenario: The shell reads only through the read endpoint

- **WHEN** the shell obtains transaction data
- **THEN** it does so through the one read request to the transactions endpoint and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the application runs
- **THEN** no row is created, altered, or deleted, which the absence of any endpoint on the server that alters data also guarantees

## ADDED Requirements

### Requirement: The only route is the index route, and it presents the transactions table

The system SHALL provide exactly one route, the index route at `/`, which presents the transactions table defined by the `transaction-table` capability. The index route SHALL NOT show invented data presented as though it were the user's own, and SHALL NOT present a control that creates, alters, or deletes stored data. The table's rows SHALL already be present in the delivered document, so that the index route is rendered by the server rather than assembled by the browser afterwards.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: Nothing is invented to fill the page

- **WHEN** the index route is rendered
- **THEN** only transactions the read endpoint returned are shown, and no transaction, category, or amount is shown as an example

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than the index route is requested
- **THEN** the failure page is delivered with a status saying that the route does not exist

#### Scenario: The delivered document already holds the rows

- **WHEN** the index route is requested and the read endpoint returns transactions
- **THEN** those rows are present in the delivered document, without the browser having to run anything to reveal them
