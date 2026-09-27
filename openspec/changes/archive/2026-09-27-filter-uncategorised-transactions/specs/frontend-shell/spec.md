# Spec Delta

## MODIFIED Requirements

### Requirement: The shell performs no domain work

The system SHALL NOT compute, derive, aggregate, or infer values about transactions or categories except for the transaction page's filter counts: the total number of transactions returned by its one read request and the number of those transactions whose category is null. The transaction page MAY use category presence to select which returned rows to display, but SHALL NOT alter the returned data or evaluate any category's regular expression. The system SHALL NOT create, alter, or delete any stored data. The shell's only relationship to stored data is the single read request the transactions table makes to the read-only transactions endpoint; the shell SHALL NOT run a statement against the database, and SHALL present the transaction values exactly as the endpoint returned them. Apart from the two filter counts and the selected view of the returned transactions, the shell SHALL NOT total, average, group, or otherwise derive a value from transaction data for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated anywhere, and no transaction is assigned a category

#### Scenario: Only the filter counts are derived from transactions

- **WHEN** the index route renders its filter options
- **THEN** it displays the total returned transaction count and the count with a null category, but computes no other aggregate or derived transaction value

#### Scenario: Filtering does not alter returned values or data

- **WHEN** the user selects the uncategorised-only view
- **THEN** the page only chooses which returned transactions to show, presents their values unchanged, and writes no data

#### Scenario: The shell reads only through the read endpoint

- **WHEN** the shell obtains transaction data
- **THEN** it does so through the one read request to the transactions endpoint and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the application runs
- **THEN** no row is created, altered, or deleted, which the absence of any endpoint on the server that alters data also guarantees
