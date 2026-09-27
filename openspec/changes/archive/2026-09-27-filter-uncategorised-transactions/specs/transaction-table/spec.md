# Spec Delta

## MODIFIED Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a table with one row per transaction that matches the selected filter. The system SHALL make no other data request to populate the table. In the default all-transactions mode, it SHALL show every returned transaction; in uncategorised-only mode, it SHALL show only returned transactions whose category is null. It SHALL NOT drop or merge any transaction that matches the selected mode. The table SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row in all mode

- **WHEN** the endpoint returns three transactions and the all-transactions mode is selected
- **THEN** the table shows three rows, one for each returned transaction

#### Scenario: Only uncategorised transactions get rows in filtered mode

- **WHEN** the endpoint returns transactions with and without categories and uncategorised-only mode is selected
- **THEN** the table shows one row for each transaction whose category is null, and no row for a categorised transaction

#### Scenario: The table is the index route's content

- **WHEN** the index route is loaded
- **THEN** the page shows a table of transactions rather than only placeholder text identifying the application

#### Scenario: No second source of rows

- **WHEN** the table is rendered
- **THEN** the transactions shown come from the read endpoint alone, and no transaction is invented, hard-coded, or read from anywhere else

## REMOVED Requirements

### Requirement: The table offers no filtering, sorting, or other data manipulation

**Reason**: This prohibition conflicts with the new read-only filter for uncategorised transactions.

**Migration**: Use the read-only category-presence filter; searching, sorting, grouping, and paging remain unavailable.

## ADDED Requirements

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a control to select either all transactions or only transactions without a category. The all-transactions option SHALL be selected by default. Changing the selection SHALL change which returned rows are shown without changing their relative order, making another data request, or creating, altering, or deleting any stored data or category. The table SHALL NOT offer controls for searching, sorting, grouping, or paging transactions.

#### Scenario: All transactions is the initial selection

- **WHEN** transaction data has loaded and the user has not changed the filter
- **THEN** the all-transactions option is selected and every returned transaction is shown

#### Scenario: The uncategorised filter is applied

- **WHEN** the user selects the option for transactions without a category
- **THEN** only transactions whose category is null are shown

#### Scenario: Returning to all transactions clears the filter

- **WHEN** the user selects the all-transactions option after selecting uncategorised-only
- **THEN** every returned transaction is shown again

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** either filter option is selected
- **THEN** matching rows remain in the order returned by the endpoint, no additional request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for searching, sorting, grouping, or paging the transactions, and no control creates, alters, or deletes transaction or category data

### Requirement: The filter options show transaction counts

After transactions have loaded successfully, the filter options SHALL each display a count: the all-transactions option SHALL show the number of transactions returned by the endpoint, and the uncategorised-only option SHALL show the number of returned transactions whose category is null. These counts SHALL be based on the complete response and SHALL remain unchanged when the selected filter changes. A failed request SHALL NOT be presented as zero transactions.

#### Scenario: Counts show the full total and uncategorised subset

- **WHEN** the endpoint returns four transactions, two of which have no category
- **THEN** the all-transactions option displays 4 and the uncategorised-only option displays 2

#### Scenario: Counts do not change when filtering

- **WHEN** the user changes the selected filter
- **THEN** both option counts continue to describe the complete endpoint response rather than only currently visible rows

#### Scenario: Zero uncategorised transactions are counted

- **WHEN** the endpoint returns transactions and every one has a category
- **THEN** the uncategorised-only option displays 0, and selecting it shows a clear empty state indicating there are no uncategorised transactions

#### Scenario: An empty response shows zero counts and the empty state

- **WHEN** the endpoint returns no transactions
- **THEN** both filter options display 0 and the page states that there are no transactions to show

#### Scenario: Failed loading is not shown as zero

- **WHEN** the request for transactions fails
- **THEN** the page shows the existing load-failure state and does not display counts that imply an empty result
