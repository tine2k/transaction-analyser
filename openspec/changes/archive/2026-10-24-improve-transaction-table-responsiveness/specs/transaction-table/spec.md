# Spec Delta

## ADDED Requirements

### Requirement: Rows are presented in progressive batches

The system SHALL present the rows of the active view in consecutive batches, so that a view of many rows begins to appear before its last row has been constructed, rather than appearing only once every row exists.

#### Scenario: A large view appears before it is complete

- **WHEN** the endpoint returns far more matching transactions than one batch holds and the view is presented
- **THEN** the table shows some of those rows while the remaining rows are not yet constructed

#### Scenario: A view small enough for one batch is presented at once

- **WHEN** the active view holds few enough transactions to fit in one batch
- **THEN** the table shows all of them without waiting for a further batch

### Requirement: A later batch leaves earlier rows in place

The system SHALL append each batch after the rows already presented and SHALL NOT reorder, replace, or re-create a row an earlier batch presented.

#### Scenario: Earlier rows keep their position

- **WHEN** a later batch is presented
- **THEN** the rows presented by earlier batches keep their position in the table and are not replaced

#### Scenario: The completed table carries the active order

- **WHEN** the active sort orders the rows by a column
- **THEN** the completed table's row order is that order, and no row moved when a later batch arrived

### Requirement: Every matching row is presented when the batches complete

The system SHALL present one row for every transaction matching the active view once its batches complete, and SHALL NOT omit a transaction because its row was due in a later batch.

#### Scenario: Every matching transaction gets its row

- **WHEN** the batches for a view of many matching transactions complete
- **THEN** the table holds exactly one row for each of those transactions

#### Scenario: A filtered-out transaction gets no row

- **WHEN** the batches complete for a view that excludes some returned transactions
- **THEN** the table holds no row for an excluded transaction

### Requirement: A changed view is presented from its own first batch

When the active view changes while batches are pending, the system SHALL stop presenting the previous view's remaining rows and present the new view in batches of its own, and the completed table SHALL show exactly the rows of the newest view.

#### Scenario: A filter change interrupts a pending view

- **WHEN** a category or period filter changes while the previous view's batches are still pending
- **THEN** the previous view's remaining rows are not presented, and the table settles on exactly the rows the new filter selects

#### Scenario: A sort change interrupts a pending view

- **WHEN** a column header is activated while the current view's batches are still pending
- **THEN** the table settles on every row of the view in the newly selected order

#### Scenario: A search change interrupts a pending view

- **WHEN** a search is applied or cleared while the current view's batches are still pending
- **THEN** the table settles on exactly the rows the applied search shows

### Requirement: The summary and count cover the whole view from the first batch

From the first batch onward, the displayed sum and transaction count SHALL describe every row of the active view, including rows a later batch has not yet presented.

#### Scenario: The summary already covers rows not yet presented

- **WHEN** the first batch of a large view is presented while later batches are still pending
- **THEN** the displayed sum and transaction count describe every row of the view, not only the rows presented

#### Scenario: The summary is unchanged by the remaining batches

- **WHEN** the remaining batches complete
- **THEN** the displayed sum and transaction count are the values they already held after the first batch

### Requirement: The selection covers rows a later batch has not presented

The select-all control SHALL select every row of the active view, including rows a later batch has not yet presented, and the bulk bar's count SHALL state the number of rows the selection holds.

#### Scenario: Select-all covers the whole view

- **WHEN** select-all is activated after the first batch of a large view while later batches are pending
- **THEN** every row of the active view is selected and the bulk bar states that number of transactions

#### Scenario: Select-all reflects the whole view's selection state

- **WHEN** every row of a large view is selected while later batches are still pending
- **THEN** the select-all control presents itself as selecting all shown rows rather than as partially selected
