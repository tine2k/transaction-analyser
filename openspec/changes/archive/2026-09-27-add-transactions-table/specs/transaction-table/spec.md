# Spec Delta

## Purpose

Defines the browser surface that lists stored transactions: the index route renders every transaction returned by the read-only `GET /api/transactions` endpoint as a table, one row per transaction, showing the amount's sign, presenting absent values as explicit gaps, preserving the endpoint's order, and offering no filtering or sorting. This capability is the presentation contract; the endpoint's response shape is owned by `transaction-read-api` and the frame by `frontend-shell`.

## ADDED Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a table with exactly one row per transaction. The system SHALL make no other data request to populate the table. The system SHALL show the whole list the endpoint returns: it SHALL NOT drop, merge, or hide a row. The table SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row

- **WHEN** the endpoint returns three transactions
- **THEN** the table shows three rows, one for each returned transaction

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

### Requirement: The table offers no filtering, sorting, or other data manipulation

The system SHALL NOT offer a control that filters, searches, sorts, groups, paginates, or otherwise changes which rows or which order the table shows. The system SHALL NOT offer a control that creates, alters, or deletes any stored data or any category. The table SHALL be read-only, and its only interaction with stored data SHALL be the one read request it makes.

#### Scenario: No filter or sort control is present

- **WHEN** the table is rendered
- **THEN** it presents no control for filtering, searching, sorting, grouping, or paging the transactions

#### Scenario: No control changes which rows appear

- **WHEN** the page is inspected
- **THEN** the set of rows shown is exactly the set the endpoint returned, and no control exists that could change it or their order

#### Scenario: Nothing can be changed from the table

- **WHEN** the page is used
- **THEN** no control creates, alters, or deletes a transaction or a category, and the page writes no data
