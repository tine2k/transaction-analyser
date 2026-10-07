# Spec Delta

## MODIFIED Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a table with one row per transaction that matches the active category and period filters. The system SHALL make no other data request to populate the table. It SHALL NOT drop or merge any transaction that matches the selected filters. The table SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row when filters include all

- **WHEN** the endpoint returns three transactions and the all-categories and all-periods filters are selected
- **THEN** the table shows three rows, one for each returned transaction

#### Scenario: The selected filters limit the rows

- **WHEN** the endpoint returns transactions across multiple periods and categories and a period and category are selected
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

The system SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the returned transaction data. It SHALL offer a single period filter with choices for all periods, each calendar month represented by at least one returned transaction, and each calendar year represented by at least one returned transaction. The period choices SHALL be ordered newest to oldest: for each represented calendar year, that year's month choices SHALL appear newest first, followed by the year's own choice, before the next represented year. A month choice SHALL be labelled with its calendar month and year, and a year choice SHALL be labelled with its calendar year and marked as a year, for example `2026 (year)`. The category filter SHALL default to uncategorised when no category is specified, preserving the existing initial selection; the period filter SHALL default to all periods. A supplied category and period filter SHALL initialize the controls and matching rows, and the selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a calendar month as `month=YYYY-MM` and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When both filters are selected, a transaction SHALL be shown only if it matches both. Changing either filter SHALL change which returned rows are shown without changing their relative order, making another data request, or creating, altering, or deleting stored data or categories. The table SHALL NOT offer controls for searching, sorting, grouping, or paging transactions.

#### Scenario: The existing uncategorised default is retained

- **WHEN** transaction data has loaded and the route has no category filter
- **THEN** uncategorised is selected and only transactions without a category are shown

#### Scenario: All categories are selected

- **WHEN** the user selects all categories
- **THEN** transactions with and without a category are eligible to be shown, subject to the period filter

#### Scenario: A named category is selected

- **WHEN** the user selects a category
- **THEN** only transactions whose category identity matches that selection are eligible to be shown, subject to the period filter

#### Scenario: Uncategorised is selected

- **WHEN** the user selects uncategorised
- **THEN** only transactions whose category is null are eligible to be shown, subject to the period filter

#### Scenario: A month is selected

- **WHEN** the user selects a calendar month
- **THEN** only transactions whose booking date falls in that month are eligible to be shown, subject to the category filter

#### Scenario: A year is selected

- **WHEN** the user selects a calendar year
- **THEN** only transactions whose booking date falls in that year are eligible to be shown, subject to the category filter

#### Scenario: Period choices list only represented periods in newest-first order

- **WHEN** the returned transactions span more than one calendar year and only some of those years' months
- **THEN** the period choices include all periods, each represented month, and each represented year, ordered newest to oldest with each year's months before that year's choice, and exclude months with no returned transaction

#### Scenario: Filter links initialize both filters

- **WHEN** the index route is opened with a category and a month in its query
- **THEN** both controls reflect those values and the table shows only rows matching both

#### Scenario: A year link initializes the period filter

- **WHEN** the index route is opened with a category and a year in its query
- **THEN** the period control reflects that year and the table shows only rows in that year matching the category

#### Scenario: An unknown period value falls back to all periods

- **WHEN** the query carries a month or year that no period choice offers
- **THEN** the period filter selects all periods and no period restriction is applied

#### Scenario: Returning to all categories clears the category restriction

- **WHEN** the user selects all categories after selecting a named category or uncategorised
- **THEN** transactions from every category are eligible to be shown, subject to the period filter

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** either or both filters are changed
- **THEN** matching rows remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for searching, sorting, grouping, or paging the transactions, and no control creates, alters, or deletes transaction or category data
