# Transaction Table Specification

## Purpose

Defines the browser surface that lists stored transactions: the index route renders transactions returned by the read-only `GET /api/transactions` endpoint as a table, one row per transaction matching the selected view, showing the amount's sign, presenting absent values as explicit gaps, preserving the endpoint's order until a sort is selected, and offering a read-only filter for uncategorised transactions. This capability is the presentation contract; the endpoint's response shape is owned by `transaction-read-api` and the frame by `frontend-shell`.

## Requirements

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

### Requirement: Dates are shown as the calendar dates they are

The system SHALL present the booking date and the value date as the calendar dates the endpoint returned, each in its own column, without shifting the day for a time zone and without adding a time of day. The two dates SHALL remain distinguishable as separate columns even when they are equal.

#### Scenario: A date is not shifted

- **WHEN** the endpoint returns a booking date of `2026-03-02`
- **THEN** the row shows that same calendar day, with no off-by-one shift

#### Scenario: The two dates are separate columns

- **WHEN** a returned transaction has a booking date of `2026-03-02` and a value date of `2026-03-01`
- **THEN** the row shows each date in its own column, and the two remain distinguishable

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

### Requirement: The table distinguishes an empty list from a failed request

The system SHALL present a defined state when the endpoint returns no transactions, stating that there are no transactions to show rather than rendering an empty table with no explanation, and it SHALL NOT invent a transaction to fill the table. The system SHALL present a distinct state when the request fails, stating that the transactions could not be loaded rather than showing an empty list that looks like "no data" or showing stale rows from a previous load. The system SHALL NOT present a failure as though the database held no transactions.

#### Scenario: An empty list is explained

- **WHEN** the endpoint returns no transactions
- **THEN** the page states that there are no transactions, and no transaction row is shown and none is invented

#### Scenario: A failure is not an empty result

- **WHEN** the request for transactions fails
- **THEN** the page states that the transactions could not be loaded, and it does not read as an empty transaction list

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

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, adjacent to the sum of visible transactions, the number of transaction rows currently shown. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible.

#### Scenario: The count matches the visible rows the sum covers

- **WHEN** the endpoint returns four transactions and the active filters show two rows while the other two are filtered out
- **THEN** the displayed transaction count is 2, describing the same rows as the sum

#### Scenario: The count follows the active filters

- **WHEN** the user changes a filter so the visible rows change
- **THEN** the displayed transaction count changes to the new number of visible rows together with the sum

#### Scenario: One visible transaction uses singular wording

- **WHEN** exactly one transaction row is visible
- **THEN** the count is presented with singular transaction wording, such as `1 transaction`

#### Scenario: No visible transactions show a zero count

- **WHEN** the active filters match no transaction
- **THEN** the displayed transaction count is 0, the sum remains a locale-formatted euro zero, and the empty state is shown

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

### Requirement: The table offers an all-transactions search field

The system SHALL offer a labelled text field on the index route that searches every transaction returned by the read endpoint, matching its text against purpose, counterparty name, and counterparty account. It SHALL provide a control that clears its text. The field's text SHALL take effect only through the search action defined by this capability.

#### Scenario: The field is offered and named

- **WHEN** transaction data has loaded successfully
- **THEN** the page shows a text field labelled as a search of all transactions

#### Scenario: Purpose text matches

- **WHEN** the user submits `market` and a returned transaction's purpose contains `Market`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty name matches

- **WHEN** the user submits `rail` and a returned transaction's counterparty name contains `Rail`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty account matches

- **WHEN** the user submits digits that occur in a returned transaction's counterparty account
- **THEN** that transaction's row is shown

#### Scenario: Letter case and diacritics are ignored

- **WHEN** the user submits `muller` and a returned transaction's counterparty name is `Müller`
- **THEN** that transaction's row is shown

#### Scenario: Every term must match the descriptive text

- **WHEN** the user submits two whitespace-separated terms and only one occurs in a returned transaction's descriptive text
- **THEN** that transaction's row is not shown

#### Scenario: Searching makes no request and changes no data

- **WHEN** the user applies or clears a search
- **THEN** no additional data request is made and no stored transaction or category is created, altered, or deleted

### Requirement: A non-empty search covers every returned transaction

While an applied search holds non-whitespace text, the system SHALL consider every transaction returned by the read endpoint and SHALL ignore the category and period filters for row selection. The filter controls SHALL remain visible with their stored values, SHALL be unavailable for interaction, and SHALL be accompanied by a visible statement that filtering is paused. Clearing the applied search SHALL restore the previously selected filters and the rows they produced. Editing the field without applying it SHALL leave the rows and the filter state unchanged.

#### Scenario: A match outside the selected filters is shown

- **WHEN** an applied search matches a returned transaction whose category or booking date does not match the selected filters
- **THEN** its row is shown while that search is applied

#### Scenario: Filters are visibly paused

- **WHEN** an applied search is non-empty
- **THEN** the category and period controls show their stored values, cannot be interacted with, and a visible statement says that filtering is paused

#### Scenario: Clearing restores the filtered view

- **WHEN** the user clears an applied search
- **THEN** the category and period controls become interactive again, keep the values they held before the search, and the table shows the rows those filters produce

#### Scenario: Whitespace-only search does not override the filters

- **WHEN** the user submits a field containing only whitespace
- **THEN** it is treated as empty and the category and period filters continue to select the rows

#### Scenario: Editing without applying leaves the filtered view

- **WHEN** the user types into the field without applying it and no search is applied
- **THEN** the category and period filters remain interactive and the table shows the same rows as before

#### Scenario: Search preserves the active sort

- **WHEN** the user applies a search while a sort is active
- **THEN** the matching rows are ordered by that sort, and clearing the search keeps the sort active

### Requirement: The search is reflected in the index route's query

The system SHALL represent the applied, trimmed search text in the index route's query as `q` and SHALL initialize the search field and its matching rows from that value. An absent or blank `q` SHALL mean no search. Applying or clearing a search SHALL update `q`; typing into the field SHALL NOT. Applying or clearing a search SHALL preserve the category, period, and sort query values.

#### Scenario: A search link initializes the field and rows

- **WHEN** the index route is opened with a `q` value
- **THEN** the search field shows that text and the table shows only the matching transactions

#### Scenario: Typing updates the query

- **WHEN** the user types search text and applies it
- **THEN** the route query carries the trimmed text as `q`

#### Scenario: Typing does not update the query

- **WHEN** the user types into the search field without applying it
- **THEN** the route query carries the previously applied `q` value, or no `q` when no search was applied

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

The visible sum and transaction count SHALL cover exactly the rows the applied search shows. When the applied search matches no transaction, the system SHALL state that no transactions match the search, distinct from the empty-response and filter-empty states. Applying or clearing a search SHALL clear the row selection; typing into the field SHALL NOT. The category option counts SHALL continue to describe the whole endpoint response.

#### Scenario: The sum and count cover the matches only

- **WHEN** an applied search matches two of the returned transactions
- **THEN** the displayed sum and transaction count cover exactly those two rows

#### Scenario: No match is explained

- **WHEN** an applied search matches no returned transaction
- **THEN** the page states that no transactions match the search, and the sum is a locale-formatted euro zero with a zero count

#### Scenario: Changing the search clears the selection

- **WHEN** the user applies or clears a search after selecting rows
- **THEN** no row remains selected and the bulk assignment bar is no longer shown

#### Scenario: Typing does not clear the selection

- **WHEN** the user types into the search field without applying it after selecting rows
- **THEN** the selected rows and the bulk assignment bar remain unchanged

#### Scenario: Select-all covers the matches

- **WHEN** the user activates the select-all control while a search is applied
- **THEN** exactly the rows the applied search shows are selected

#### Scenario: Option counts keep describing the whole response

- **WHEN** a search is applied
- **THEN** the all-transactions and uncategorised option counts still describe the complete endpoint response rather than only the matches

### Requirement: The search is applied by an explicit search action

The system SHALL provide a labelled search action beside the field. Activating the action SHALL apply the field's trimmed text, and pressing Enter in the field SHALL do the same. The visible rows, paused-filter state, summary, count, empty state, route query, and selection SHALL change only when a search is applied or cleared. Applying an empty or whitespace-only field SHALL clear the applied search.

#### Scenario: The search action is offered

- **WHEN** transaction data has loaded successfully
- **THEN** the page shows a button labelled as searching beside the search field

#### Scenario: Typing alone applies nothing

- **WHEN** the user types into the field without activating the search action
- **THEN** the visible rows, sum, count, empty state, filter controls, route query, and row selection remain unchanged

#### Scenario: The button applies the draft

- **WHEN** the user activates the search button with text in the field
- **THEN** the matching rows are shown, the filters are paused when the text is non-empty, and the route query carries that text as `q`

#### Scenario: Enter applies the draft

- **WHEN** the user presses Enter in the search field with text in it
- **THEN** the same search is applied as activating the search button

#### Scenario: An empty submission clears the applied search

- **WHEN** the user applies a field that is empty or whitespace-only while a search is applied
- **THEN** the applied search is cleared, `q` is removed, and the category and period filters select the rows again
