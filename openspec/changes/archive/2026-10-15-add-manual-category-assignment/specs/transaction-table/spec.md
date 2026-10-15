# Spec Delta

## MODIFIED Requirements

### Requirement: Each row carries one column per transaction element

The system SHALL give the table one column for each piece of a transaction: booking date, value date, amount, purpose, counterparty name, counterparty account, and category. Each cell SHALL show the value for that transaction and that element alone. The table MAY carry one selection-control column, which holds no transaction value and states nothing about the transaction. The system SHALL NOT add any other column, and SHALL NOT add a column that holds a value the transaction does not carry, such as a running balance, a total, or a derived direction.

#### Scenario: A fully populated transaction fills every column

- **WHEN** a returned transaction carries a booking date, a value date, an amount, a purpose, a counterparty name, a counterparty account, and a category
- **THEN** its row shows each of those seven values in its own column

#### Scenario: No derived column is added

- **WHEN** the table's columns are inspected
- **THEN** every column corresponds to a transaction element or is the selection-control column, and no column shows a total, balance, count, or other value computed from the transactions

#### Scenario: The selection column holds no transaction value

- **WHEN** the selection-control column is inspected
- **THEN** it offers no transaction value and adds no column that states anything about the transaction

### Requirement: An absent value is shown as an explicit gap

The system SHALL distinguish an absent optional value from a present one. When a transaction's counterparty account is absent, the system SHALL show a visible gap in that column rather than an empty string or a borrowed value. When a transaction is uncategorised, the category column's assignment control SHALL present the absence explicitly — as the `Uncategorised` choice — rather than a category name, and SHALL NOT invent a category for the absence. The system SHALL NOT present an absent value as an empty string that could be mistaken for a value the transaction carries.

#### Scenario: An absent counterparty account reads as absent

- **WHEN** a returned transaction has no counterparty account
- **THEN** its account cell shows an explicit absence rather than an empty or made-up account

#### Scenario: An uncategorised transaction reads as uncategorised

- **WHEN** a returned transaction carries no category
- **THEN** its category control presents the explicit `Uncategorised` choice, and no category name is shown for it

#### Scenario: A present value is not confused with an absent one

- **WHEN** one returned transaction carries a category and another does not
- **THEN** the first shows the category's name as its category control's value and the second shows the explicit absence, and the two cells are distinguishable

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the returned transaction data. It SHALL offer a single period filter with choices for all periods, each calendar month represented by at least one returned transaction, and each calendar year represented by at least one returned transaction. The period choices SHALL be presented in two labelled groups: a `Years` group listing each represented calendar year newest first, and a `Months` group listing each represented calendar month newest first, with the months group after the years group. The all-periods choice SHALL appear before both groups. A month choice SHALL be labelled with its calendar month and year, and a year choice SHALL be labelled with its calendar year alone. The category filter SHALL default to uncategorised when no category is specified, preserving the existing initial selection; the period filter SHALL default to all periods. A supplied category and period filter SHALL initialize the controls and matching rows, and the selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a calendar month as `month=YYYY-MM` and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When both filters are selected, a transaction SHALL be shown only if it matches both. Changing either filter SHALL change which returned rows are shown without changing their relative order, making another data request, or creating, altering, or deleting stored data or categories. The table SHALL NOT offer controls for searching, sorting, grouping, or paging transactions; the category-assignment controls defined by `manual-category-assignment` are not filter controls and remain permitted, and the filter controls themselves SHALL NOT create, alter, or delete stored data.

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

#### Scenario: Period choices are grouped and labelled

- **WHEN** transaction data has loaded and the period filter is inspected
- **THEN** its choices present a `Years` group and a `Months` group with the all-periods choice outside both groups

#### Scenario: Period choices list only represented periods in newest-first order

- **WHEN** the returned transactions span more than one calendar year and only some of those years' months
- **THEN** the period choices include all periods, each represented month, and each represented year, with the years group listing the represented years newest first, the months group listing the represented months newest first after the years group, and months with no returned transaction excluded

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
- **THEN** it presents no control for searching, sorting, grouping, or paging the transactions, and the only controls that change stored data are the category-assignment controls, which change no category
