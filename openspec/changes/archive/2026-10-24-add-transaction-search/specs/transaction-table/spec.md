# Spec Delta

## MODIFIED Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a table with one row per transaction that matches the active view. The active view is the search when the search holds non-whitespace text, and the active category and period filters otherwise. The system SHALL make no other data request to populate the table. It SHALL NOT drop or merge any transaction that matches the active view. The table SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row when filters include all

- **WHEN** the endpoint returns three transactions, the search is empty, and the all-categories and all-periods filters are selected
- **THEN** the table shows three rows, one for each returned transaction

#### Scenario: The selected filters limit the rows

- **WHEN** the endpoint returns transactions across multiple periods and categories, the search is empty, and a period and category are selected
- **THEN** the table shows exactly the transactions matching both selections

#### Scenario: Only uncategorised transactions get rows when that category is selected

- **WHEN** the endpoint returns transactions with and without categories, the search is empty, and uncategorised is selected
- **THEN** the table shows one row for each transaction whose category is null, and no row for a categorised transaction

#### Scenario: The table is the index route's content

- **WHEN** the index route is loaded
- **THEN** the page shows a table of transactions rather than only placeholder text identifying the application

#### Scenario: No second source of rows

- **WHEN** the table is rendered
- **THEN** the transactions shown come from the read endpoint alone, and no transaction is invented, hard-coded, or read from anywhere else

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the returned transaction data. It SHALL offer a single period filter with choices for all periods, each calendar month represented by at least one returned transaction, and each calendar year represented by at least one returned transaction. The period choices SHALL be presented in two labelled groups: a `Years` group listing each represented calendar year newest first, and a `Months` group listing each represented calendar month newest first, with the months group after the years group. The all-periods choice SHALL appear before both groups. A month choice SHALL be labelled with its calendar month and year, and a year choice SHALL be labelled with its calendar year alone. The period filter SHALL default to the browser's current calendar year when the returned transactions include it, otherwise to the newest calendar year represented in the returned transactions, and to all periods when no transaction is returned. The category filter SHALL default to uncategorised when no category is specified and at least one returned transaction in the effective default period has no category; otherwise it SHALL default to all categories. The effective default period is the period named by a supplied query value that the period choices offer, otherwise the period selected by the period default above. A supplied category and period filter SHALL initialize the controls and matching rows, and the selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a calendar month as `month=YYYY-MM` and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When both filters are selected and the search is empty, a transaction SHALL be shown only if it matches both. A non-empty search SHALL override both filters as specified by the search requirements of this capability. Changing either filter SHALL change which returned rows are shown without changing the active sort, making another data request, or creating, altering, or deleting stored data or categories. The table SHALL NOT offer controls for grouping or paging transactions, and sorting SHALL be offered only through the column headers defined by this capability; the category-assignment controls defined by `manual-category-assignment` are not filter controls and remain permitted, and the filter controls themselves SHALL NOT create, alter, or delete stored data.

#### Scenario: The current year is the initial period

- **WHEN** transaction data has loaded, the returned transactions include the browser's current calendar year, the route has no period filter, and the search is empty
- **THEN** the period filter selects that current year and only transactions whose booking date falls in that year are shown, subject to the category filter

#### Scenario: The newest represented year is the fallback period

- **WHEN** transaction data has loaded, the returned transactions do not include the browser's current calendar year, the route has no period filter, and the search is empty
- **THEN** the period filter selects the newest calendar year represented in the returned transactions

#### Scenario: No transactions fall back to all periods

- **WHEN** the endpoint returns no transactions, the route has no period filter, and the search is empty
- **THEN** the period filter selects all periods and all categories

#### Scenario: The existing uncategorised default is retained

- **WHEN** transaction data has loaded, the search is empty, and at least one returned transaction in the effective default period has no category
- **THEN** uncategorised is selected and only transactions without a category in that period are shown

#### Scenario: All categories are the initial category when the default period has none uncategorised

- **WHEN** transaction data has loaded, the search is empty, the effective default period holds returned transactions, and every one of them has a category
- **THEN** all categories is selected and every transaction in that period is shown

#### Scenario: A supplied period determines the uncategorised default

- **WHEN** the route names an offered month or year, no category is specified, the search is empty, and that period holds an uncategorised transaction
- **THEN** the period filter selects that period, uncategorised is selected, and the rows are the uncategorised transactions in that period

#### Scenario: A supplied category overrides the category default

- **WHEN** the route names an offered category and period and the search is empty
- **THEN** both controls reflect those values and the table shows only rows matching both, regardless of whether the default period holds an uncategorised transaction

#### Scenario: All categories are selected

- **WHEN** the user selects all categories and the search is empty
- **THEN** transactions with and without a category are eligible to be shown, subject to the period filter

#### Scenario: A named category is selected

- **WHEN** the user selects a category and the search is empty
- **THEN** only transactions whose category identity matches that selection are eligible to be shown, subject to the period filter

#### Scenario: Uncategorised is selected

- **WHEN** the user selects uncategorised and the search is empty
- **THEN** only transactions whose category is null are eligible to be shown, subject to the period filter

#### Scenario: A month is selected

- **WHEN** the user selects a calendar month and the search is empty
- **THEN** only transactions whose booking date falls in that month are eligible to be shown, subject to the category filter

#### Scenario: A year is selected

- **WHEN** the user selects a calendar year and the search is empty
- **THEN** only transactions whose booking date falls in that year are eligible to be shown, subject to the category filter

#### Scenario: Period choices are grouped and labelled

- **WHEN** transaction data has loaded and the period filter is inspected
- **THEN** its choices present a `Years` group and a `Months` group with the all-periods choice outside both groups

#### Scenario: Period choices list only represented periods in newest-first order

- **WHEN** the returned transactions span more than one calendar year and only some of those years' months
- **THEN** the period choices include all periods, each represented month, and each represented year, with the years group listing the represented years newest first, the months group listing the represented months newest first after the years group, and months with no returned transaction excluded

#### Scenario: Filter links initialize both filters

- **WHEN** the index route is opened with a category and a month in its query and the search is empty
- **THEN** both controls reflect those values and the table shows only rows matching both

#### Scenario: A year link initializes the period filter

- **WHEN** the index route is opened with a category and a year in its query and the search is empty
- **THEN** the period control reflects that year and the table shows only rows in that year matching the category

#### Scenario: An unknown period value falls back to all periods

- **WHEN** the query carries a month or year that no period choice offers and no transaction is returned
- **THEN** the period filter selects all periods

#### Scenario: An unknown period value falls back to the period default

- **WHEN** the query carries a month or year that no period choice offers and at least one transaction is returned
- **THEN** the period filter selects the default period for the returned transactions

#### Scenario: Returning to all categories clears the category restriction

- **WHEN** the user selects all categories after selecting a named category or uncategorised while the search is empty
- **THEN** transactions from every category are eligible to be shown, subject to the period filter

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** either or both filters are changed while no sort is active and the search is empty
- **THEN** matching rows remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: Filtering preserves the active sort

- **WHEN** either or both filters are changed while a sort is active and the search is empty
- **THEN** matching rows remain in the active sort order, the sort stays in the route query, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for grouping or paging the transactions, the search field defined by this capability is the only searching control, sorting is offered only through the column headers, and the only controls that change stored data are the category-assignment controls, which change no category

## ADDED Requirements

### Requirement: The table offers an all-transactions search field

The system SHALL offer a labelled text field on the index route that searches every transaction returned by the read endpoint, matching its text against purpose, counterparty name, and counterparty account. It SHALL provide a control that clears its text.

#### Scenario: The field is offered and named

- **WHEN** transaction data has loaded successfully
- **THEN** the page shows a text field labelled as a search of all transactions

#### Scenario: Purpose text matches

- **WHEN** the user enters `market` and a returned transaction's purpose contains `Market`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty name matches

- **WHEN** the user enters `rail` and a returned transaction's counterparty name contains `Rail`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty account matches

- **WHEN** the user enters digits that occur in a returned transaction's counterparty account
- **THEN** that transaction's row is shown

#### Scenario: Letter case and diacritics are ignored

- **WHEN** the user enters `muller` and a returned transaction's counterparty name is `Müller`
- **THEN** that transaction's row is shown

#### Scenario: Every term must match the descriptive text

- **WHEN** the user enters two whitespace-separated terms and only one occurs in a returned transaction's descriptive text
- **THEN** that transaction's row is not shown

#### Scenario: Searching makes no request and changes no data

- **WHEN** the user changes the search text
- **THEN** no additional data request is made and no stored transaction or category is created, altered, or deleted

### Requirement: A non-empty search covers every returned transaction

While the search holds non-whitespace text, the system SHALL consider every transaction returned by the read endpoint and SHALL ignore the category and period filters for row selection. The filter controls SHALL remain visible with their stored values, SHALL be unavailable for interaction, and SHALL be accompanied by a visible statement that filtering is paused. Clearing the search SHALL restore the previously selected filters and the rows they produced.

#### Scenario: A match outside the selected filters is shown

- **WHEN** a returned transaction matches the search but its category or booking date does not match the selected filters
- **THEN** its row is shown while the search is non-empty

#### Scenario: Filters are visibly paused

- **WHEN** the search is non-empty
- **THEN** the category and period controls show their stored values, cannot be interacted with, and a visible statement says that filtering is paused

#### Scenario: Clearing restores the filtered view

- **WHEN** the user clears a non-empty search
- **THEN** the category and period controls become interactive again, keep the values they held before the search, and the table shows the rows those filters produce

#### Scenario: Whitespace-only search does not override the filters

- **WHEN** the search contains only whitespace
- **THEN** it is treated as empty and the category and period filters continue to select the rows

#### Scenario: Search preserves the active sort

- **WHEN** the user searches while a sort is active
- **THEN** the matching rows are ordered by that sort, and clearing the search keeps the sort active

### Requirement: The search is reflected in the index route's query

The system SHALL represent the trimmed search text in the index route's query as `q` and SHALL initialize the search field and its matching rows from that value. An absent or blank `q` SHALL mean no search. Clearing the search SHALL remove `q`. Applying or clearing a search SHALL preserve the category, period, and sort query values.

#### Scenario: A search link initializes the field and rows

- **WHEN** the index route is opened with a `q` value
- **THEN** the search field shows that text and the table shows only the matching transactions

#### Scenario: Typing updates the query

- **WHEN** the user enters search text
- **THEN** the route query carries the trimmed text as `q`

#### Scenario: Clearing removes the query value

- **WHEN** the user clears the search field
- **THEN** the route query carries no `q`

#### Scenario: A reload keeps the search

- **WHEN** the page is reloaded after a search was applied
- **THEN** the search field shows the same text and the same matching rows are shown

#### Scenario: The query keeps the other view controls

- **WHEN** the user applies or clears a search
- **THEN** the category, period, and sort values in the route query are unchanged

### Requirement: Search results drive the summary, count, empty state, and selection

The visible sum and transaction count SHALL cover exactly the rows the active search shows. When the search matches no transaction, the system SHALL state that no transactions match the search, distinct from the empty-response and filter-empty states. Changing the search text SHALL clear the row selection. The category option counts SHALL continue to describe the whole endpoint response.

#### Scenario: The sum and count cover the matches only

- **WHEN** the search matches two of the returned transactions
- **THEN** the displayed sum and transaction count cover exactly those two rows

#### Scenario: No match is explained

- **WHEN** the search matches no returned transaction
- **THEN** the page states that no transactions match the search, and the sum is a locale-formatted euro zero with a zero count

#### Scenario: Changing the search clears the selection

- **WHEN** the user changes the search text after selecting rows
- **THEN** no row remains selected and the bulk assignment bar is no longer shown

#### Scenario: Select-all covers the matches

- **WHEN** the user activates the select-all control while a search is active
- **THEN** exactly the rows the search shows are selected

#### Scenario: Option counts keep describing the whole response

- **WHEN** a search is active
- **THEN** the all-transactions and uncategorised option counts still describe the complete endpoint response rather than only the matches
