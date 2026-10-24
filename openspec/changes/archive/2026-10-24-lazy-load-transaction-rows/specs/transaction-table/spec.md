# Spec Delta

## MODIFIED Requirements

### Requirement: Rows are presented in progressive batches

The system SHALL present the rows of the active view in consecutive batches, starting with a first batch, and SHALL append each further batch only when the reader scrolls near the end of the rows already presented. The system SHALL NOT keep appending batches while the reader remains at the start of the presented rows or while no scrolling occurs.

#### Scenario: A large view appears before it is complete

- **WHEN** the endpoint returns far more matching transactions than one batch holds and the view is presented
- **THEN** the table shows some of those rows while the remaining rows are not yet constructed

#### Scenario: A view small enough for one batch is presented at once

- **WHEN** the active view holds few enough transactions to fit in one batch
- **THEN** the table shows all of them without waiting for a further batch

#### Scenario: Remaining rows wait for the reader

- **WHEN** the first batch of a large view is presented and the reader does not scroll
- **THEN** the rows beyond the first batch remain unconstructed

#### Scenario: Approaching the end appends the next batch

- **WHEN** the reader scrolls near the end of the rows already presented and more rows match the active view
- **THEN** the next batch is appended after the presented rows

### Requirement: Every matching row is presented when the batches complete

The system SHALL present one row for every transaction matching the active view when the reader scrolls to the end of the presented rows, and SHALL NOT omit a transaction because its row was due in a later batch.

#### Scenario: Every matching transaction gets its row

- **WHEN** the reader scrolls through a view of many matching transactions until no further batch arrives
- **THEN** the table holds exactly one row for each of those transactions

#### Scenario: A filtered-out transaction gets no row

- **WHEN** the reader reaches the end of a view that excludes some returned transactions
- **THEN** the table holds no row for an excluded transaction

#### Scenario: Reaching the end stops the batches

- **WHEN** every matching row has been presented and a further batch would hold no rows
- **THEN** no further batch is appended and the presented rows remain unchanged

### Requirement: A changed view is presented from its own first batch

When the active view changes, the system SHALL stop presenting the previous view's remaining rows, discard the previous view's presented rows, and present the new view from its own first batch. Once the reader scrolls through the new view, the table SHALL show exactly the rows of the newest view.

#### Scenario: A filter change interrupts a pending view

- **WHEN** a category or period filter changes while the previous view's batches are still pending
- **THEN** the previous view's remaining rows are not presented, and the table starts again from the first batch of the rows the new filter selects

#### Scenario: A sort change interrupts a pending view

- **WHEN** a column header is activated while the current view's batches are still pending
- **THEN** the table starts again from the first batch in the newly selected order

#### Scenario: A search change interrupts a pending view

- **WHEN** a search is applied or cleared while the current view's batches are still pending
- **THEN** the table starts again from the first batch of the rows the applied search shows

#### Scenario: The new view reaches its own end

- **WHEN** the reader scrolls to the end of a changed view
- **THEN** the table shows exactly the rows of that view and none from the previous view
