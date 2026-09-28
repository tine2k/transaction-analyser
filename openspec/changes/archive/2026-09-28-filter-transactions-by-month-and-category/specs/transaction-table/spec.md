# Spec Delta

## MODIFIED Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a table with one row per transaction that matches the active category and month filters. The system SHALL make no other data request to populate the table. It SHALL NOT drop or merge any transaction that matches the selected filters. The table SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row when filters include all

- **WHEN** the endpoint returns three transactions and the all-categories and all-months filters are selected
- **THEN** the table shows three rows, one for each returned transaction

#### Scenario: The selected filters limit the rows

- **WHEN** the endpoint returns transactions across multiple months and categories and a month and category are selected
- **THEN** the table shows exactly the transactions matching both selections

#### Scenario: Only uncategorised transactions get rows when that category is selected

- **WHEN** the endpoint returns transactions with and without categories and uncategorised is selected
- **THEN** the table shows one row for each transaction whose category is null, and no row for a categorised transaction

#### Scenario: The table is the index route's content

- **WHEN** the index route is loaded
- **THEN** the page shows a table of transactions rather than only placeholder text identifying the application

#### Scenario: No second source of rows

- **WHEN** the table is rendered
- **THEN** the transactions shown come from the read endpoint alone, and no transaction is invented, hard-coded, or read from anywhere else

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the returned transaction data. It SHALL offer a month filter that can select all months or a calendar month. The category filter SHALL default to uncategorised when no category is specified, preserving the existing initial selection; the month filter SHALL default to all months. A supplied category or month filter SHALL initialize the controls and matching rows, and the selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly. The month filter SHALL match the transaction's booking date calendar month. When both filters are selected, a transaction SHALL be shown only if it matches both. Changing either filter SHALL change which returned rows are shown without changing their relative order, making another data request, or creating, altering, or deleting stored data or categories. The table SHALL NOT offer controls for searching, sorting, grouping, or paging transactions.

#### Scenario: The existing uncategorised default is retained

- **WHEN** transaction data has loaded and the route has no category filter
- **THEN** uncategorised is selected and only transactions without a category are shown

#### Scenario: All categories are selected

- **WHEN** the user selects all categories
- **THEN** transactions with and without a category are eligible to be shown, subject to the month filter

#### Scenario: A named category is selected

- **WHEN** the user selects a category
- **THEN** only transactions whose category identity matches that selection are eligible to be shown, subject to the month filter

#### Scenario: Uncategorised is selected

- **WHEN** the user selects uncategorised
- **THEN** only transactions whose category is null are eligible to be shown, subject to the month filter

#### Scenario: A month is selected

- **WHEN** the user selects a calendar month
- **THEN** only transactions whose booking date falls in that month are eligible to be shown, subject to the category filter

#### Scenario: Filter links initialize both filters

- **WHEN** the index route is opened with a category and month in its query
- **THEN** both controls reflect those values and the table shows only rows matching both

#### Scenario: Returning to all categories clears the category restriction

- **WHEN** the user selects all categories after selecting a named category or uncategorised
- **THEN** transactions from every category are eligible to be shown, subject to the month filter

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** either or both filters are changed
- **THEN** matching rows remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for searching, sorting, grouping, or paging the transactions, and no control creates, alters, or deletes transaction or category data

## ADDED Requirements

### Requirement: The table shows the exact sum of visible transaction amounts

The system SHALL display a sum for the transaction rows currently shown after applying the active filters. The sum SHALL be the signed arithmetic total of those rows' returned decimal amounts, SHALL use exact decimal arithmetic without floating-point rounding, and SHALL change when the visible rows change. The sum SHALL be presented separately from the transaction columns and SHALL NOT alter or imply a stored transaction value. When no row is visible, the sum SHALL be zero.

#### Scenario: The sum reflects only visible rows

- **WHEN** visible rows have amounts `-12.50` and `4.00` while another filtered-out row has amount `100.00`
- **THEN** the displayed sum is `-8.50`

#### Scenario: The sum preserves exact decimal values

- **WHEN** visible rows have amounts `0.01` and `-0.02`
- **THEN** the displayed sum is `-0.01` without floating-point approximation or rounding

#### Scenario: No visible transactions have a zero sum

- **WHEN** the active filters match no transaction
- **THEN** the table's displayed sum is zero
