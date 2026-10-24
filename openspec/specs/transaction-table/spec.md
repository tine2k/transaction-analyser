# Transaction Table Specification

## Purpose

Defines the browser surface that lists stored transactions: the index route renders transactions returned by the read-only `GET /api/transactions` endpoint as a table, one row per transaction matching the selected view, showing the amount's sign, presenting absent values as explicit gaps, preserving the endpoint's order until a sort is selected, and offering a read-only filter for uncategorised transactions. This capability is the presentation contract; the endpoint's response shape is owned by `transaction-read-api` and the frame by `frontend-shell`.

## Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a table with one row per transaction that matches the active view. The active view is the search when the search holds non-whitespace text, and the person, category, and period filters otherwise. The system SHALL make no other data request to populate the table. It SHALL NOT drop or merge any transaction that matches the active view. The table SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row when filters include all

- **WHEN** the endpoint returns three transactions, the search is empty, and the all-people, all-categories, and all-periods filters are selected
- **THEN** the table shows three rows, one for each returned transaction

#### Scenario: The selected filters limit the rows

- **WHEN** the endpoint returns transactions across multiple people, periods, and categories, the search is empty, and a person, period, and category are selected
- **THEN** the table shows exactly the transactions matching all three selections

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

The system SHALL give the table one column for each piece of a transaction: booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category. Each cell SHALL show the value for that transaction and that element alone. The table MAY carry one selection-control column, which holds no transaction value and states nothing about the transaction. The system SHALL NOT add any other column, and SHALL NOT add a column that holds a value the transaction does not carry, such as a running balance, a total, or a derived direction.

#### Scenario: A fully populated transaction fills every column

- **WHEN** a returned transaction carries a booking date, a value date, an amount, a purpose, a counterparty name, a counterparty account, a person, and a category
- **THEN** its row shows each of those eight values in its own column

#### Scenario: The person column is distinct from the counterparty account

- **WHEN** a row is inspected
- **THEN** its person cell shows the owner and its counterparty account cell shows the other party's account, and neither value is shown in the other's column

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

The system SHALL make each value column header — booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category — an activation control that sorts the visible rows by that column. Activating a different header SHALL sort ascending; activating the active header SHALL toggle between ascending and descending. The active header SHALL expose its column and direction to assistive technology. The selection-control header SHALL NOT sort.

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

- **WHEN** the user sorts by purpose, counterparty name, person, or category
- **THEN** rows are ordered by a locale-aware comparison that ignores letter case

#### Scenario: Person sorts by name

- **WHEN** the user sorts by person
- **THEN** rows are ordered by the person's current name, and rows sharing a person keep their endpoint order

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
- **THEN** no additional data request is made and no stored transaction, person, or category is created, altered, or deleted

### Requirement: The active sort is reflected in the route query

The system SHALL represent the active sort in the index route's query as a column and a direction, and SHALL initialize the table from those values so a sorted view can be linked to directly. A recognized column SHALL sort by that column; an absent, unknown, or unsupported column SHALL leave the rows in the endpoint's order. A missing or invalid direction for a recognized column SHALL mean ascending. Applying a sort SHALL preserve the existing person, category, and period query values.

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
- **THEN** the route query carries the active column and direction and the existing person, category, and period values are preserved

#### Scenario: A person sort is linkable

- **WHEN** the index route is opened with the person sort column and a direction
- **THEN** the table is sorted by the person's name in that direction

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

The system SHALL offer a person filter with choices for all people and each person represented in the returned transaction data. It SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the selected person's returned transaction data. It SHALL offer a single period filter with choices for all periods, each calendar month represented by at least one of the selected person's returned transactions, and each calendar year represented by at least one of the selected person's returned transactions. The period choices SHALL be presented in two labelled groups: a `Years` group listing each represented calendar year newest first, and a `Months` group listing each represented calendar month newest first, with the months group after the years group. The all-periods choice SHALL appear before both groups. A month choice SHALL be labelled with its calendar month and year, and a year choice SHALL be labelled with its calendar year alone.

The person filter SHALL default to all people. The period filter SHALL default to the browser's current calendar year when the selected person's returned transactions include it, otherwise to the newest calendar year represented in the selected person's transactions, and to all periods when the selected person has no returned transaction. The category filter SHALL default to uncategorised when no category is specified and at least one of the selected person's returned transactions in the effective default period has no category; otherwise it SHALL default to all categories. The effective default period is the period named by a supplied query value that the period choices offer, otherwise the period selected by the period default above.

A supplied person SHALL initialize the person control when the choices offer it; an absent, unknown, or unoffered person SHALL select all people. A supplied category and period filter SHALL initialize their controls and matching rows when the choices offer them. The selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a person as `person=<id>`, a calendar month as `month=YYYY-MM`, and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When a person and a category and/or period are selected and the search is empty, a transaction SHALL be shown only if it matches the person and the other selected filters. A non-empty search SHALL override the category and period filters as the search requirements define, and SHALL NOT override the person filter.

Changing any filter SHALL change which returned rows are shown without changing the active sort, making another data request, or creating, altering, or deleting stored data, people, or categories. Changing the person filter SHALL clear the row selection. The table SHALL NOT offer controls for grouping or paging transactions, and sorting SHALL be offered only through the column headers defined by this capability; the category-assignment controls defined by `manual-category-assignment` are not filter controls and remain permitted, and the filter controls themselves SHALL NOT create, alter, or delete stored data.

#### Scenario: The current year is the initial period

- **WHEN** transaction data has loaded, the selected person's returned transactions include the browser's current calendar year, the route has no period filter, and the search is empty
- **THEN** the period filter selects that current year and only that person's transactions whose booking date falls in that year are shown, subject to the category filter

#### Scenario: The newest represented year is the fallback period

- **WHEN** transaction data has loaded, the selected person's returned transactions do not include the browser's current calendar year, the route has no period filter, and the search is empty
- **THEN** the period filter selects the newest calendar year represented in that person's returned transactions

#### Scenario: No transactions fall back to all periods

- **WHEN** the endpoint returns no transactions, the route has no period filter, and the search is empty
- **THEN** the period filter selects all periods and all categories

#### Scenario: The existing uncategorised default is retained

- **WHEN** transaction data has loaded, the search is empty, and at least one of the selected person's returned transactions in the effective default period has no category
- **THEN** uncategorised is selected and only that person's transactions without a category in that period are shown

#### Scenario: All categories are the initial category when the default period has none uncategorised

- **WHEN** transaction data has loaded, the search is empty, the effective default period holds the selected person's returned transactions, and every one of them has a category
- **THEN** all categories is selected and every one of that person's transactions in that period is shown

#### Scenario: A supplied period determines the uncategorised default

- **WHEN** the route names an offered month or year, no category is specified, the search is empty, and that period holds one of the selected person's uncategorised transactions
- **THEN** the period filter selects that period, uncategorised is selected, and the rows are that person's uncategorised transactions in that period

#### Scenario: A supplied category overrides the category default

- **WHEN** the route names an offered category and period and the search is empty
- **THEN** both controls reflect those values and the table shows only the selected person's rows matching both, regardless of whether the default period holds an uncategorised transaction

#### Scenario: All categories are selected

- **WHEN** the user selects all categories and the search is empty
- **THEN** the selected person's transactions with and without a category are eligible to be shown, subject to the period filter

#### Scenario: A named category is selected

- **WHEN** the user selects a category and the search is empty
- **THEN** only the selected person's transactions whose category identity matches that selection are eligible to be shown, subject to the period filter

#### Scenario: Uncategorised is selected

- **WHEN** the user selects uncategorised and the search is empty
- **THEN** only the selected person's transactions whose category is null are eligible to be shown, subject to the period filter

#### Scenario: A month is selected

- **WHEN** the user selects a calendar month and the search is empty
- **THEN** only the selected person's transactions whose booking date falls in that month are eligible to be shown, subject to the category filter

#### Scenario: A year is selected

- **WHEN** the user selects a calendar year and the search is empty
- **THEN** only the selected person's transactions whose booking date falls in that year are eligible to be shown, subject to the category filter

#### Scenario: A person is selected

- **WHEN** the user selects a person and the search is empty
- **THEN** only the returned transactions that reference that person are eligible to be shown, subject to the category and period filters

#### Scenario: All people are selected

- **WHEN** the user selects all people and the search is empty
- **THEN** transactions from every person are eligible to be shown, subject to the category and period filters

#### Scenario: The person filter scopes the period choices

- **WHEN** a person is selected whose transactions represent fewer years or months than the complete response
- **THEN** the period choices offer only the years and months represented in that person's transactions

#### Scenario: The person filter scopes the category choices and counts

- **WHEN** a person is selected
- **THEN** the category choices and their counts describe that person's returned transactions, not the complete response

#### Scenario: Changing the person clears the selection

- **WHEN** the user selects a different person after selecting rows
- **THEN** no row remains selected and the bulk assignment bar is no longer shown

#### Scenario: Period choices are grouped and labelled

- **WHEN** transaction data has loaded and the period filter is inspected
- **THEN** its choices present a `Years` group and a `Months` group with the all-periods choice outside both groups

#### Scenario: Period choices list only represented periods in newest-first order

- **WHEN** the selected person's returned transactions span more than one calendar year and only some of those years' months
- **THEN** the period choices include all periods, each represented month, and each represented year, with the years group listing the represented years newest first, the months group listing the represented months newest first after the years group, and months with no returned transaction for that person excluded

#### Scenario: Filter links initialize the person filter

- **WHEN** the index route is opened with a person in its query and the choices offer that person
- **THEN** the person control reflects that person and the table shows only that person's rows

#### Scenario: An unknown person falls back to all people

- **WHEN** the query carries a person that no choice offers
- **THEN** the person filter selects all people

#### Scenario: Filter links initialize both filters

- **WHEN** the index route is opened with a category and a month in its query and the search is empty
- **THEN** both controls reflect those values and the table shows only rows matching both within the selected person

#### Scenario: A year link initializes the period filter

- **WHEN** the index route is opened with a category and a year in its query and the search is empty
- **THEN** the period control reflects that year and the table shows only rows in that year matching the category within the selected person

#### Scenario: An unknown period value falls back to all periods

- **WHEN** the query carries a month or year that no period choice offers and no transaction is returned
- **THEN** the period filter selects all periods

#### Scenario: An unknown period value falls back to the period default

- **WHEN** the query carries a month or year that no period choice offers and at least one transaction is returned
- **THEN** the period filter selects the default period for the selected person's returned transactions

#### Scenario: Returning to all categories clears the category restriction

- **WHEN** the user selects all categories after selecting a named category or uncategorised while the search is empty
- **THEN** the selected person's transactions from every category are eligible to be shown, subject to the period filter

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** any filter is changed while no sort is active and the search is empty
- **THEN** matching rows remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: Filtering preserves the active sort

- **WHEN** any filter is changed while a sort is active and the search is empty
- **THEN** matching rows remain in the active sort order, the sort stays in the route query, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for grouping or paging the transactions, the search field defined by this capability is the only searching control, sorting is offered only through the column headers, and the only controls that change stored data are the category-assignment controls, which change no category

### Requirement: The table shows the exact sum of visible transaction amounts

The system SHALL display a sum for the transaction rows currently shown after applying the active filters. The sum SHALL be the signed arithmetic total of those rows' returned decimal amounts, SHALL be computed with exact decimal arithmetic without floating-point rounding, and SHALL change when the visible rows change. The system SHALL present the sum using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping and currency placement, while preserving the exact decimal value without rounding it. The sum SHALL be presented separately from the transaction columns and SHALL NOT alter or imply a stored transaction value. The sum SHALL be presented as secondary information beneath the displayed transaction count: its label and value SHALL use smaller type and the muted text colour, and it SHALL NOT compete with the count for visual emphasis. When no row is visible, the sum SHALL be zero, presented as a locale-formatted euro zero.

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

#### Scenario: The sum is secondary to the count

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the sum is presented beneath the count in smaller type and the muted text colour, while the count carries the summary's primary emphasis

#### Scenario: The secondary placement survives filtering

- **WHEN** the user changes a filter and the visible rows and their sum change
- **THEN** the updated sum remains secondary to the count rather than becoming the summary's dominant figure

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, as the summary's primary figure, the number of transaction rows currently shown, with the sum of those rows presented as secondary information beneath it. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible. The count SHALL precede the sum in the summary's reading order and SHALL use the summary's largest type and the primary ink colour, capped at the interface type scale's `text-xl` step (1.25rem) so it stays at that size at every viewport width rather than growing to page-title scale.

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

#### Scenario: The count is the summary's most prominent figure

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the count uses a larger type size and the primary ink colour, and the sum uses smaller muted type

#### Scenario: The count precedes the sum

- **WHEN** the summary is read in document order
- **THEN** the transaction count comes before the sum of displayed transactions

#### Scenario: The count keeps its prominence for every visible row count

- **WHEN** the visible rows change so the count is one, many, or zero
- **THEN** the count remains the summary's primary figure with the appropriate singular or plural wording, and the sum remains secondary

#### Scenario: The count stays compact at every viewport

- **WHEN** the summary is rendered on a narrow or a wide viewport
- **THEN** the count renders at the `text-xl` step of 20px in both cases, without scaling up at the wider viewport, while the sum remains smaller and muted

### Requirement: The filter options show transaction counts

After transactions have loaded successfully, the filter options SHALL each display a count: the all-categories option SHALL show the number of transactions returned for the selected person, and the uncategorised-only option SHALL show the number of those transactions whose category is null. These counts SHALL be based on the selected person's transactions and SHALL remain unchanged when the selected category or period changes; they SHALL change when the selected person changes. A failed request SHALL NOT be presented as zero transactions.

#### Scenario: Counts show the full total and uncategorised subset

- **WHEN** the selected person has four returned transactions, two of which have no category
- **THEN** the all-categories option displays 4 and the uncategorised-only option displays 2

#### Scenario: Counts do not change when filtering

- **WHEN** the user changes the selected category or period
- **THEN** both option counts continue to describe the selected person's transactions rather than only the currently visible rows

#### Scenario: Counts follow the selected person

- **WHEN** the user selects a different person
- **THEN** both option counts describe that person's returned transactions, not the previous person's and not the complete response

#### Scenario: Zero uncategorised transactions are counted

- **WHEN** the selected person's returned transactions all have a category
- **THEN** the uncategorised-only option displays 0, and selecting it shows a clear empty state indicating there are no uncategorised transactions

#### Scenario: An empty response shows zero counts and the empty state

- **WHEN** the endpoint returns no transactions
- **THEN** both filter options display 0 and the page states that there are no transactions to show

#### Scenario: Failed loading is not shown as zero

- **WHEN** the request for transactions fails
- **THEN** the page shows the existing load-failure state and does not display counts that imply an empty result

### Requirement: The table offers an all-transactions search field

The system SHALL offer a labelled text field on the index route that searches the returned transactions of the selected person, matching its text against purpose, counterparty name, and counterparty account. It SHALL provide a control that clears its text. The field's text SHALL take effect only through the search action defined by this capability. The field SHALL be labelled as a search of transactions, not as a search of every person.

#### Scenario: The field is offered and named

- **WHEN** transaction data has loaded successfully
- **THEN** the page shows a text field labelled as a search of transactions

#### Scenario: Purpose text matches

- **WHEN** the user submits `market` and a returned transaction of the selected person has a purpose containing `Market`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty name matches

- **WHEN** the user submits `rail` and a returned transaction of the selected person has a counterparty name containing `Rail`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty account matches

- **WHEN** the user submits digits that occur in a returned transaction's counterparty account
- **THEN** that transaction's row is shown

#### Scenario: Letter case and diacritics are ignored

- **WHEN** the user submits `muller` and a returned transaction of the selected person has a counterparty name `Müller`
- **THEN** that transaction's row is shown

#### Scenario: Every term must match the descriptive text

- **WHEN** the user submits two whitespace-separated terms and only one occurs in a returned transaction's descriptive text
- **THEN** that transaction's row is not shown

#### Scenario: Searching makes no request and changes no data

- **WHEN** the user applies or clears a search
- **THEN** no additional data request is made and no stored transaction, person, or category is created, altered, or deleted

### Requirement: A non-empty search covers every returned transaction

While an applied search holds non-whitespace text, the system SHALL consider every transaction returned by the read endpoint for the selected person and SHALL ignore the category and period filters for row selection. The category and period filter controls SHALL remain visible with their stored values, SHALL be unavailable for interaction, and SHALL be accompanied by a visible statement that category and period filtering is paused. The person filter SHALL remain visible and available for interaction, and its selected person SHALL continue to scope the search. Clearing the applied search SHALL restore the previously selected category and period filters and the rows they produced within the selected person. Editing the field without applying it SHALL leave the rows and the filter state unchanged.

#### Scenario: A match outside the selected filters is shown

- **WHEN** an applied search matches a returned transaction of the selected person whose category or booking date does not match the selected filters
- **THEN** its row is shown while that search is applied

#### Scenario: Filters are visibly paused

- **WHEN** an applied search is non-empty
- **THEN** the category and period controls show their stored values, cannot be interacted with, and a visible statement says that category and period filtering is paused

#### Scenario: The person filter remains active

- **WHEN** an applied search is non-empty
- **THEN** the person control remains visible and interactive, and the search considers only the selected person's transactions

#### Scenario: Clearing restores the filtered view

- **WHEN** the user clears an applied search
- **THEN** the category and period controls become interactive again, keep the values they held before the search, and the table shows the rows those filters produce within the selected person

#### Scenario: Whitespace-only search does not override the filters

- **WHEN** the user submits a field containing only whitespace
- **THEN** it is treated as empty and the person, category, and period filters continue to select the rows

#### Scenario: Editing without applying leaves the filtered view

- **WHEN** the user types into the field without applying it and no search is applied
- **THEN** the category and period filters remain interactive and the table shows the same rows as before

#### Scenario: Search preserves the active sort

- **WHEN** the user applies a search while a sort is active
- **THEN** the matching rows are ordered by that sort, and clearing the search keeps the sort active

### Requirement: The search is reflected in the index route's query

The system SHALL represent the applied, trimmed search text in the index route's query as `q` and SHALL initialize the search field and its matching rows from that value. An absent or blank `q` SHALL mean no search. Applying or clearing a search SHALL update `q`; typing into the field SHALL NOT. Applying or clearing a search SHALL preserve the person, category, period, and sort query values.

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
- **THEN** the person, category, period, and sort values in the route query are unchanged

### Requirement: Search results drive the summary, count, empty state, and selection

The visible sum and transaction count SHALL cover exactly the rows the applied search shows within the selected person. When the applied search matches no transaction, the system SHALL state that no transactions match the search, distinct from the empty-response and filter-empty states. Applying or clearing a search SHALL clear the row selection; typing into the field SHALL NOT. The category and uncategorised option counts SHALL continue to describe the selected person's transactions.

#### Scenario: The sum and count cover the matches only

- **WHEN** an applied search matches two of the selected person's returned transactions
- **THEN** the displayed sum and transaction count cover exactly those two rows

#### Scenario: No match is explained

- **WHEN** an applied search matches none of the selected person's returned transactions
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
- **THEN** the all-categories and uncategorised option counts still describe the selected person's transactions rather than only the matches

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
- **THEN** the matching rows are shown, the category and period filters are paused when the text is non-empty, the person filter remains active, and the route query carries that text as `q`

#### Scenario: Enter applies the draft

- **WHEN** the user presses Enter in the search field with text in it
- **THEN** the same search is applied as activating the search button

#### Scenario: An empty submission clears the applied search

- **WHEN** the user applies a field that is empty or whitespace-only while a search is applied
- **THEN** the applied search is cleared, `q` is removed, and the person, category, and period filters select the rows again

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

### Requirement: A later batch leaves earlier rows in place

The system SHALL append each batch after the rows already presented and SHALL NOT reorder, replace, or re-create a row an earlier batch presented.

#### Scenario: Earlier rows keep their position

- **WHEN** a later batch is presented
- **THEN** the rows presented by earlier batches keep their position in the table and are not replaced

#### Scenario: The completed table carries the active order

- **WHEN** the active sort orders the rows by a column
- **THEN** the completed table's row order is that order, and no row moved when a later batch arrived

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

- **WHEN** a person, category, or period filter changes while the previous view's batches are still pending
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

### Requirement: The summary and count cover the whole view from the first batch

From the first batch onward, the displayed sum and transaction count SHALL describe every row of the active view, including rows a later batch has not yet presented.

#### Scenario: The summary already covers rows not yet presented

- **WHEN** the first batch of a large view is presented while later batches are still pending
- **THEN** the displayed sum and transaction count describe every row of the view, not only the rows presented

#### Scenario: The summary is unchanged by the remaining batches

- **WHEN** the remaining batches complete
- **THEN** the displayed sum and transaction count are the values they already held after the first batch

### Requirement: The selection covers rows a later batch has not presented

The select-all control SHALL select every row of the active view, including rows a later batch has not yet presented, and the bulk bar's count SHALL state the number of rows the selection holds.

#### Scenario: Select-all covers the whole view

- **WHEN** select-all is activated after the first batch of a large view while later batches are pending
- **THEN** every row of the active view is selected and the bulk bar states that number of transactions

#### Scenario: Select-all reflects the whole view's selection state

- **WHEN** every row of a large view is selected while later batches are still pending
- **THEN** the select-all control presents itself as selecting all shown rows rather than as partially selected
