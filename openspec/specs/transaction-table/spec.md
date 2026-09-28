# Transaction Table Specification

## Purpose

Defines the browser surface that lists stored transactions: the index route renders transactions returned by the read-only `GET /api/transactions` endpoint as a table, one row per transaction matching the selected view, showing the amount's sign, presenting absent values as explicit gaps, preserving the endpoint's order, and offering a read-only filter for uncategorised transactions. This capability is the presentation contract; the endpoint's response shape is owned by `transaction-read-api` and the frame by `frontend-shell`.

## Requirements

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

### Requirement: Each row carries one column per transaction element

The system SHALL give the table one column for each piece of a transaction: booking date, value date, amount, purpose, counterparty name, counterparty account, and category. Each cell SHALL show the value for that transaction and that element alone. The system SHALL NOT add a column that holds a value the transaction does not carry, such as a running balance, a total, or a derived direction.

#### Scenario: A fully populated transaction fills every column

- **WHEN** a returned transaction carries a booking date, a value date, an amount, a purpose, a counterparty name, a counterparty account, and a category
- **THEN** its row shows each of those seven values in its own column

#### Scenario: No derived column is added

- **WHEN** the table's columns are inspected
- **THEN** every column corresponds to a transaction element, and no column shows a total, balance, count, or other value computed from the transactions

### Requirement: The amount is shown exactly as the read endpoint returned it

The system SHALL present each transaction's amount as the signed decimal value the endpoint returned, preserving both its digits and its sign, so that the direction of the money movement is readable from the rendered value. The system SHALL NOT convert the amount to a floating-point number, round it, reformat it in a way that loses a digit, or hide its sign. A negative amount SHALL render with a visible minus and a positive amount SHALL render as positive, and the two SHALL be distinguishable from the rendered value alone.

#### Scenario: A negative amount keeps its sign and digits

- **WHEN** the endpoint returns an amount of `-42.75`
- **THEN** the row shows `-42.75`, from which it reads as money out

#### Scenario: A positive amount reads as money in

- **WHEN** the endpoint returns an amount of `250.00`
- **THEN** the row shows that positive value, from which it reads as money in

#### Scenario: No precision is lost in presentation

- **WHEN** the endpoint returns an amount such as `0.01` or `-1234.56`
- **THEN** the row shows exactly that value, with no rounding or floating-point approximation

### Requirement: An absent value is shown as an explicit gap

The system SHALL distinguish an absent optional value from a present one. When a transaction's counterparty account is absent, the system SHALL show a visible gap in that column rather than an empty string or a borrowed value. When a transaction is uncategorised, the system SHALL show a visible gap in the category column rather than a category name, and SHALL NOT invent a category for the absence. The system SHALL NOT present an absent value as an empty string that could be mistaken for a value the transaction carries.

#### Scenario: An absent counterparty account reads as absent

- **WHEN** a returned transaction has no counterparty account
- **THEN** its account cell shows an explicit absence rather than an empty or made-up account

#### Scenario: An uncategorised transaction reads as uncategorised

- **WHEN** a returned transaction carries no category
- **THEN** its category cell shows an explicit absence, and no category name is shown for it

#### Scenario: A present value is not confused with an absent one

- **WHEN** one returned transaction carries a category and another does not
- **THEN** the first shows the category's name and the second shows an explicit absence, and the two cells are distinguishable

### Requirement: Dates are shown as the calendar dates they are

The system SHALL present the booking date and the value date as the calendar dates the endpoint returned, each in its own column, without shifting the day for a time zone and without adding a time of day. The two dates SHALL remain distinguishable as separate columns even when they are equal.

#### Scenario: A date is not shifted

- **WHEN** the endpoint returns a booking date of `2026-03-02`
- **THEN** the row shows that same calendar day, with no off-by-one shift

#### Scenario: The two dates are separate columns

- **WHEN** a returned transaction has a booking date of `2026-03-02` and a value date of `2026-03-01`
- **THEN** the row shows each date in its own column, and the two remain distinguishable

### Requirement: Rows appear in the order the endpoint returns them

The system SHALL render the rows in the order the endpoint returned them, and SHALL NOT reorder them for presentation. The system SHALL NOT apply an ordering of its own, and SHALL NOT let any part of the table change the sequence of rows.

#### Scenario: The endpoint's order is preserved

- **WHEN** the endpoint returns transactions in a given order
- **THEN** the table shows their rows in that same order

#### Scenario: The table introduces no order of its own

- **WHEN** the table is rendered
- **THEN** the row sequence matches the endpoint's response and no client-side reordering occurs

### Requirement: The table distinguishes an empty list from a failed request

The system SHALL present a defined state when the endpoint returns no transactions, stating that there are no transactions to show rather than rendering an empty table with no explanation, and it SHALL NOT invent a transaction to fill the table. The system SHALL present a distinct state when the request fails, stating that the transactions could not be loaded rather than showing an empty list that looks like "no data" or showing stale rows from a previous load. The system SHALL NOT present a failure as though the database held no transactions.

#### Scenario: An empty list is explained

- **WHEN** the endpoint returns no transactions
- **THEN** the page states that there are no transactions, and no transaction row is shown and none is invented

#### Scenario: A failure is not an empty result

- **WHEN** the request for transactions fails
- **THEN** the page states that the transactions could not be loaded, and it does not read as an empty transaction list

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

### Requirement: The table shows the exact sum of visible transaction amounts

The system SHALL display a sum for the transaction rows currently shown after applying the active filters. The sum SHALL be the signed arithmetic total of those rows' returned decimal amounts, SHALL be computed with exact decimal arithmetic without floating-point rounding, and SHALL change when the visible rows change. The system SHALL present the sum using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping and currency placement, while preserving the exact decimal value without rounding it. The sum SHALL be presented separately from the transaction columns and SHALL NOT alter or imply a stored transaction value. When no row is visible, the sum SHALL be zero, presented as a locale-formatted euro zero.

#### Scenario: The sum reflects only visible rows

- **WHEN** visible rows have amounts `-12.50` and `4.00` while another filtered-out row has amount `100.00`
- **THEN** the displayed sum is the locale-formatted euro value of `-8.50`

#### Scenario: The sum preserves exact decimal values

- **WHEN** visible rows have amounts `0.01` and `-0.02`
- **THEN** the displayed sum is the locale-formatted euro value of `-0.01`, without floating-point approximation or rounding

#### Scenario: The sum follows locale currency conventions

- **WHEN** the visible rows have a sum large enough to be grouped under the active locale
- **THEN** the displayed sum uses that locale's EUR currency and number conventions, including thousands grouping, and its sign remains readable

#### Scenario: No visible transactions have a zero sum

- **WHEN** the active filters match no transaction
- **THEN** the table's displayed sum is a locale-formatted euro zero

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
