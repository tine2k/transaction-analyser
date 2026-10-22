# Spec Delta

## ADDED Requirements

### Requirement: Column headers sort the table

The system SHALL make each value column header — booking date, value date, amount, purpose, counterparty name, counterparty account, and category — an activation control that sorts the visible rows by that column. Activating a different header SHALL sort ascending; activating the active header SHALL toggle between ascending and descending. The active header SHALL expose its column and direction to assistive technology. The selection-control header SHALL NOT sort.

#### Scenario: First activation sorts ascending

- **WHEN** the user activates a column header while no sort is active
- **THEN** the rows are sorted ascending by that column

#### Scenario: Repeated activation toggles direction

- **WHEN** the user activates the active column's header again
- **THEN** the rows are sorted descending by that column, and further activations alternate between ascending and descending

#### Scenario: A different column starts ascending

- **WHEN** the user activates a header other than the active one
- **THEN** the rows are sorted ascending by the newly activated column

#### Scenario: Amounts sort by numeric value

- **WHEN** the user sorts by amount
- **THEN** rows are ordered by the signed decimal value, so a negative amount sorts before a smaller-magnitude positive amount, and no amount is compared as plain text or through floating-point rounding

#### Scenario: Dates sort chronologically

- **WHEN** the user sorts by booking date or value date
- **THEN** rows are ordered by calendar date rather than by any reformatted text

#### Scenario: Text sorts without case sensitivity

- **WHEN** the user sorts by purpose, counterparty name, or category
- **THEN** rows are ordered by a locale-aware comparison that ignores letter case

#### Scenario: Missing account or category sorts last

- **WHEN** the user sorts by counterparty account or category and some rows have no value
- **THEN** rows without an account or category appear after rows that have one, in both ascending and descending order

#### Scenario: Equal values keep the endpoint's order

- **WHEN** two rows compare equal under the active sort
- **THEN** they keep their relative order from the endpoint response

#### Scenario: The selection header does not sort

- **WHEN** the user activates the header of the selection-control column
- **THEN** the row order does not change and no sort becomes active

#### Scenario: The active sort is announced

- **WHEN** a sort is active
- **THEN** its column header reports the ascending or descending direction to assistive technology, and every other sortable header reports that it is not sorted

#### Scenario: Sorting leaves the summary unchanged

- **WHEN** the user changes the sort
- **THEN** the set of visible rows, their sum, and their count remain unchanged, and only their order differs

#### Scenario: Sorting makes no request and changes no data

- **WHEN** the user changes the sort
- **THEN** no additional data request is made and no stored transaction or category is created, altered, or deleted

### Requirement: The active sort is reflected in the route query

The system SHALL represent the active sort in the index route's query as a column and a direction, and SHALL initialize the table from those values so a sorted view can be linked to directly. A recognized column SHALL sort by that column; an absent, unknown, or unsupported column SHALL leave the rows in the endpoint's order. A missing or invalid direction for a recognized column SHALL mean ascending. Applying a sort SHALL preserve the existing category and period query values.

#### Scenario: A sort link initializes the table

- **WHEN** the index route is opened with a recognized sort column and direction in its query
- **THEN** the table is sorted by that column and direction before the user interacts with it

#### Scenario: The direction is read from the query

- **WHEN** the query names a recognized column with a descending direction
- **THEN** the table is sorted descending by that column

#### Scenario: An unknown column falls back to the endpoint's order

- **WHEN** the query names a column that the table does not sort
- **THEN** no sort is applied, no header reports an active sort, and the rows keep the endpoint's order

#### Scenario: A missing or invalid direction means ascending

- **WHEN** the query names a recognized column without a valid direction
- **THEN** the table is sorted ascending by that column

#### Scenario: Activating a header updates the query

- **WHEN** the user activates a sortable header
- **THEN** the route query carries the active column and direction and the existing category and period values are preserved

#### Scenario: A reload keeps the sorted view

- **WHEN** the page is reloaded after a sort was applied
- **THEN** the table shows the same sorted order and the same active header direction

#### Scenario: No sort keeps the endpoint's order

- **WHEN** the route query carries no sort
- **THEN** the rows appear in the endpoint's order and no header reports an active sort

### Requirement: Rows keep the endpoint's order until a sort is selected

When the route carries no recognized sort, the system SHALL render rows in the order the endpoint returned them and SHALL NOT apply an order of its own. The endpoint's order SHALL also break ties between rows that compare equal under an active sort, so the resulting order is deterministic.

#### Scenario: The endpoint's order is preserved without a sort

- **WHEN** the endpoint returns transactions in a given order and no sort is active
- **THEN** the table shows their rows in that same order

#### Scenario: No order is invented without a sort

- **WHEN** the table is rendered without a recognized sort
- **THEN** the row sequence matches the endpoint's response and no client-side reordering occurs

## MODIFIED Requirements

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the returned transaction data. It SHALL offer a single period filter with choices for all periods, each calendar month represented by at least one returned transaction, and each calendar year represented by at least one returned transaction. The period choices SHALL be presented in two labelled groups: a `Years` group listing each represented calendar year newest first, and a `Months` group listing each represented calendar month newest first, with the months group after the years group. The all-periods choice SHALL appear before both groups. A month choice SHALL be labelled with its calendar month and year, and a year choice SHALL be labelled with its calendar year alone. The category filter SHALL default to uncategorised when no category is specified, preserving the existing initial selection; the period filter SHALL default to all periods. A supplied category and period filter SHALL initialize the controls and matching rows, and the selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a calendar month as `month=YYYY-MM` and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When both filters are selected, a transaction SHALL be shown only if it matches both. Changing either filter SHALL change which returned rows are shown without changing the active sort, making another data request, or creating, altering, or deleting stored data or categories. The table SHALL NOT offer controls for searching, grouping, or paging transactions, and sorting SHALL be offered only through the column headers defined by this capability; the category-assignment controls defined by `manual-category-assignment` are not filter controls and remain permitted, and the filter controls themselves SHALL NOT create, alter, or delete stored data.

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

- **WHEN** either or both filters are changed while no sort is active
- **THEN** matching rows remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: Filtering preserves the active sort

- **WHEN** either or both filters are changed while a sort is active
- **THEN** matching rows remain in the active sort order, the sort stays in the route query, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for searching, grouping, or paging the transactions, sorting is offered only through the column headers, and the only controls that change stored data are the category-assignment controls, which change no category

## REMOVED Requirements

### Requirement: Rows appear in the order the endpoint returns them

**Reason**: The table now offers user-selected sorting, so rows no longer always appear in the endpoint's order. The endpoint-order guarantee is retained for the unsorted case by the added requirement "Rows keep the endpoint's order until a sort is selected".

**Migration**: No action is needed for existing links or clients: a route without a recognized sort keeps the previous endpoint order. Links that should keep that order simply omit the sort parameters.
