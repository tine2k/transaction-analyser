# Transaction Table Specification

## Purpose

Defines the browser surface that lists stored transactions: the index route renders transactions returned by the read-only `GET /api/transactions` endpoint as a table, one row per transaction matching the selected view, showing the amount's sign, presenting absent values as explicit gaps, preserving the endpoint's order until a sort is selected, and offering a read-only filter for uncategorised transactions. This capability is the presentation contract; the endpoint's response shape is owned by `transaction-read-api` and the frame by `frontend-shell`.

## Requirements

### Requirement: The index route presents every transaction in a table

The system SHALL request `GET /api/transactions` from the same origin when the index route is loaded, and SHALL render the returned transactions as a transaction list with one item per transaction that matches the active view. Below the `sm` breakpoint the list SHALL be presented as cards; from the `sm` breakpoint up it SHALL be presented as a semantic table. The active view is the search when the search holds non-whitespace text, and the person, category, and period filters otherwise. The system SHALL make no other data request to populate the list. It SHALL NOT drop or merge any transaction that matches the active view. The list SHALL be the index route's content, replacing the placeholder text the shell previously carried.

#### Scenario: Every returned transaction gets a row when filters include all

- **WHEN** the endpoint returns three transactions, the search is empty, and the all-people, all-categories, and all-periods filters are selected
- **THEN** the list shows three items, one for each returned transaction

#### Scenario: The selected filters limit the rows

- **WHEN** the endpoint returns transactions across multiple people, periods, and categories, the search is empty, and a person, period, and category are selected
- **THEN** the list shows exactly the transactions matching all three selections

#### Scenario: Only uncategorised transactions get rows when that category is selected

- **WHEN** the endpoint returns transactions with and without categories, the search is empty, and uncategorised is selected
- **THEN** the list shows one item for each transaction whose category is null, and no item for a categorised transaction

#### Scenario: The table is the index route's content

- **WHEN** the index route is loaded
- **THEN** the page shows a list of transactions rather than only placeholder text identifying the application

#### Scenario: The presentation follows the viewport width

- **WHEN** the index route is rendered below the `sm` breakpoint and again from `sm` up
- **THEN** the first rendering presents transaction cards and the second presents the transaction table

#### Scenario: No second source of rows

- **WHEN** the list is rendered
- **THEN** the transactions shown come from the read endpoint alone, and no transaction is invented, hard-coded, or read from anywhere else

### Requirement: Each row carries one column per transaction element

In the table, the system SHALL give one column for each piece of a transaction: booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category. In the card list, each card SHALL show the same eight values, grouped into the card's rows rather than columns. Each value SHALL show the value for that transaction and that element alone. The list MAY carry one selection control per item, which holds no transaction value and states nothing about the transaction. The system SHALL NOT add any other value, and SHALL NOT add a value the transaction does not carry, such as a running balance, a total, or a derived direction.

#### Scenario: A fully populated transaction fills every column

- **WHEN** a returned transaction carries a booking date, a value date, an amount, a purpose, a counterparty name, a counterparty account, a person, and a category
- **THEN** its table row shows each of those eight values in its own column and its card shows each of those eight values in its own labelled region

#### Scenario: The person column is distinct from the counterparty account

- **WHEN** a row or card is inspected
- **THEN** its person value shows the owner and its counterparty account value shows the other party's account, and neither value is shown in the other's place

#### Scenario: No derived column is added

- **WHEN** the list's values are inspected
- **THEN** every value corresponds to a transaction element or is the selection control, and no value shows a total, balance, count, or other value computed from the transactions

#### Scenario: The selection column holds no transaction value

- **WHEN** the selection control is inspected
- **THEN** it offers no transaction value and adds no value that states anything about the transaction

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

The system SHALL make each table value column header — booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category — an activation control that sorts the visible rows by that column. At phone widths the card list SHALL instead offer a labelled sort control listing the same eight value columns. Activating a different column SHALL sort ascending; activating the active column again SHALL toggle between ascending and descending. The active column and direction SHALL be exposed to assistive technology through the header or the card-list sort control. The selection control SHALL NOT sort.

#### Scenario: First activation sorts ascending

- **WHEN** the user activates a column header or chooses a sort column while no sort is active
- **THEN** the items are sorted ascending by that column

#### Scenario: Repeated activation toggles direction

- **WHEN** the user activates the active column's header again or uses the card list's direction control
- **THEN** the items are sorted in the other direction, and further activations alternate between ascending and descending

#### Scenario: A different column starts ascending

- **WHEN** the user activates a header or chooses a sort column other than the active one
- **THEN** the items are sorted ascending by the newly activated column

#### Scenario: Amounts sort by numeric value

- **WHEN** the user sorts by amount
- **THEN** items are ordered by the signed decimal value, so a negative amount sorts before a smaller-magnitude positive amount, and no amount is compared as plain text or through floating-point rounding

#### Scenario: Dates sort chronologically

- **WHEN** the user sorts by booking date or value date
- **THEN** items are ordered by calendar date rather than by any reformatted text

#### Scenario: Text sorts without case sensitivity

- **WHEN** the user sorts by purpose, counterparty name, person, or category
- **THEN** items are ordered by a locale-aware comparison that ignores letter case

#### Scenario: Person sorts by name

- **WHEN** the user sorts by person
- **THEN** items are ordered by the person's current name, and items sharing a person keep their endpoint order

#### Scenario: Missing account or category sorts last

- **WHEN** the user sorts by counterparty account or category and some items have no value
- **THEN** items without an account or category appear after items that have one, in both ascending and descending order

#### Scenario: Equal values keep the endpoint's order

- **WHEN** two items compare equal under the active sort
- **THEN** they keep their relative order from the endpoint response

#### Scenario: The selection header does not sort

- **WHEN** the user inspects or activates the selection control
- **THEN** the item order does not change and no sort becomes active

#### Scenario: The active sort is announced

- **WHEN** a sort is active
- **THEN** the active table header or the card-list sort control reports the ascending or descending direction to assistive technology, and every other sortable column reports that it is not sorted

#### Scenario: Sorting leaves the summary unchanged

- **WHEN** the user changes the sort
- **THEN** the set of visible items, their sum, and their count remain unchanged, and only their order differs

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

A supplied person SHALL initialize the person control when the choices offer it; an absent, unknown, or unoffered person SHALL select all people. A supplied category and period filter SHALL initialize their controls and matching items when the choices offer them. The selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a person as `person=<id>`, a calendar month as `month=YYYY-MM`, and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When a person and a category and/or period are selected and the search is empty, a transaction SHALL be shown only if it matches the person and the other selected filters. A non-empty search SHALL override the category and period filters as the search requirements define, and SHALL NOT override the person filter.

Changing any filter SHALL change which returned items are shown without changing the active sort, making another data request, or creating, altering, or deleting stored data, people, or categories. Changing the person filter SHALL clear the item selection. The list SHALL NOT offer controls for grouping transactions or for Previous/Next pagination. Sorting SHALL be offered through the table headers at desktop widths and through the card-list sort control at phone widths. The Load more control defined by this capability is a batch control, not paging. The category-assignment controls defined by `manual-category-assignment` are not filter controls and remain permitted, and the filter controls themselves SHALL NOT create, alter, or delete stored data.

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
- **THEN** the period filter selects that period, uncategorised is selected, and the items are that person's uncategorised transactions in that period

#### Scenario: A supplied category overrides the category default

- **WHEN** the route names an offered category and period and the search is empty
- **THEN** both controls reflect those values and the list shows only the selected person's items matching both, regardless of whether the default period holds an uncategorised transaction

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

- **WHEN** the user selects a different person after selecting items
- **THEN** no item remains selected and the bulk assignment bar is no longer shown

#### Scenario: Period choices are grouped and labelled

- **WHEN** transaction data has loaded and the period filter is inspected
- **THEN** its choices present a `Years` group and a `Months` group with the all-periods choice outside both groups

#### Scenario: Period choices list only represented periods in newest-first order

- **WHEN** the selected person's returned transactions span more than one calendar year and only some of those years' months
- **THEN** the period choices include all periods, each represented month, and each represented year, with the years group listing the represented years newest first, the months group listing the represented months newest first after the years group, and months with no returned transaction for that person excluded

#### Scenario: Filter links initialize the person filter

- **WHEN** the index route is opened with a person in its query and the choices offer that person
- **THEN** the person control reflects that person and the list shows only that person's items

#### Scenario: An unknown person falls back to all people

- **WHEN** the query carries a person that no choice offers
- **THEN** the person filter selects all people

#### Scenario: Filter links initialize both filters

- **WHEN** the index route is opened with a category and a month in its query and the search is empty
- **THEN** both controls reflect those values and the list shows only items matching both within the selected person

#### Scenario: A year link initializes the period filter

- **WHEN** the index route is opened with a category and a year in its query and the search is empty
- **THEN** the period control reflects that year and the list shows only items in that year matching the category within the selected person

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
- **THEN** matching items remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: Filtering preserves the active sort

- **WHEN** any filter is changed while a sort is active and the search is empty
- **THEN** matching items remain in the active sort order, the sort stays in the route query, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the list is rendered
- **THEN** it presents no control for grouping the transactions and no Previous/Next pagination, the search field defined by this capability is the only searching control, sorting is offered only by the table headers or the card-list sort control, Load more only appends a batch, and the only controls that change stored data are the category-assignment controls, which change no category

### Requirement: The table shows the exact sum of visible transaction amounts

The system SHALL display a sum for the transaction rows currently shown after applying the active filters. The sum SHALL be the signed arithmetic total of those rows' returned decimal amounts, SHALL be computed with exact decimal arithmetic without floating-point rounding, and SHALL change when the visible rows change. The system SHALL present the sum using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping and currency placement, while preserving the exact decimal value without rounding it. The sum SHALL be presented separately from the transaction columns and SHALL NOT alter or imply a stored transaction value. The sum SHALL be presented beside the displayed transaction count on the summary line beneath the page title: its label and value SHALL use the muted text colour and the same interface type size as the count. When no row is visible, the sum SHALL be zero, presented as a locale-formatted euro zero.

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
- **THEN** the sum is presented on the summary line beside the count in the muted text colour, at the same interface type size as the count

#### Scenario: The secondary placement survives filtering

- **WHEN** the user changes a filter and the visible rows and their sum change
- **THEN** the updated sum remains on the summary line beneath the page title beside the updated count

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, on the summary line beneath the page title, the number of transaction rows currently shown together with the sum of those rows. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible. The count SHALL precede the sum in the summary's reading order and on the rendered line, and SHALL use the primary ink colour at the interface type size rather than page-title scale. The summary SHALL report no total beyond the count and the visible-row sum.

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

#### Scenario: The count precedes the sum

- **WHEN** the summary line is read in document order
- **THEN** the transaction count comes before the sum of displayed transactions

#### Scenario: The count is the summary's most prominent figure

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the count uses the primary ink colour and the sum uses the muted colour at the same interface type size

#### Scenario: The count keeps its prominence for every visible row count

- **WHEN** the visible rows change so the count is one, many, or zero
- **THEN** the count remains the summary's primary figure through its ink colour and singular or plural wording, while the sum stays muted

#### Scenario: The count stays compact at every viewport

- **WHEN** the summary is rendered on a narrow or a wide viewport
- **THEN** the count renders at the interface type size in both cases, without scaling to page-title size, while the sum stays the same size and muted

#### Scenario: The summary sits beneath the page title

- **WHEN** the Transactions screen is rendered
- **THEN** the summary line appears after the `Transactions` page title and before the filter controls

#### Scenario: The summary adds no other total

- **WHEN** the summary line is rendered
- **THEN** it shows only the visible transaction count and the visible-row sum, and presents no income, spending, or other aggregate the read endpoint did not return

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

The system SHALL present the items of the active view in consecutive batches, starting with a first batch. At desktop widths the system SHALL append each further batch only when the reader scrolls near the end of the items already presented. At phone widths the system SHALL append the next batch only when the reader activates the Load more control. The system SHALL NOT keep appending batches without a scroll or an activation, and SHALL NOT present a later batch before its predecessor.

#### Scenario: A large view appears before it is complete

- **WHEN** the endpoint returns far more matching transactions than one batch holds and the view is presented
- **THEN** the list shows some of those items while the remaining items are not yet constructed

#### Scenario: A view small enough for one batch is presented at once

- **WHEN** the active view holds few enough transactions to fit in one batch
- **THEN** the list shows all of them without waiting for a further batch

#### Scenario: Remaining rows wait for the reader

- **WHEN** the first batch of a large view is presented and the reader neither scrolls the table nor activates Load more
- **THEN** the items beyond the first batch remain unconstructed

#### Scenario: Approaching the end appends the next batch

- **WHEN** the reader scrolls near the end of the table's presented rows and more items match the active view
- **THEN** the next batch is appended after the presented rows

#### Scenario: Load more appends the next phone batch

- **WHEN** the phone card list shows Load more and the reader activates it while more items match the active view
- **THEN** the next batch is appended after the presented cards and the earlier cards keep their position

### Requirement: A later batch leaves earlier rows in place

The system SHALL append each batch after the rows already presented and SHALL NOT reorder, replace, or re-create a row an earlier batch presented.

#### Scenario: Earlier rows keep their position

- **WHEN** a later batch is presented
- **THEN** the rows presented by earlier batches keep their position in the table and are not replaced

#### Scenario: The completed table carries the active order

- **WHEN** the active sort orders the rows by a column
- **THEN** the completed table's row order is that order, and no row moved when a later batch arrived

### Requirement: Every matching row is presented when the batches complete

The system SHALL present one item for every transaction matching the active view when the reader reaches the end of the presented items, whether by scrolling the desktop table or by activating Load more on the phone card list until no further batch remains, and SHALL NOT omit a transaction because its item was due in a later batch.

#### Scenario: Every matching transaction gets its row

- **WHEN** the reader scrolls or activates Load more through a view of many matching transactions until no further batch arrives
- **THEN** the list holds exactly one item for each of those transactions

#### Scenario: A filtered-out transaction gets no row

- **WHEN** the reader reaches the end of a view that excludes some returned transactions
- **THEN** the list holds no item for an excluded transaction

#### Scenario: Reaching the end stops the batches

- **WHEN** every matching item has been presented and a further batch would hold no items
- **THEN** no further batch is appended, Load more is no longer offered, and the presented items remain unchanged

### Requirement: A changed view is presented from its own first batch

When the active view changes, the system SHALL stop presenting the previous view's remaining items, discard the previous view's presented items, and present the new view from its own first batch. Once the reader scrolls through the new view or, on phones, activates Load more until no further batch remains, the list SHALL show exactly the items of the newest view.

#### Scenario: A filter change interrupts a pending view

- **WHEN** a person, category, or period filter changes while the previous view's batches are still pending
- **THEN** the previous view's remaining items are not presented, and the list starts again from the first batch of the items the new filter selects

#### Scenario: A sort change interrupts a pending view

- **WHEN** a column header or the card-list sort control changes the sort while the current view's batches are still pending
- **THEN** the list starts again from the first batch in the newly selected order

#### Scenario: A search change interrupts a pending view

- **WHEN** a search is applied or cleared while the current view's batches are still pending
- **THEN** the list starts again from the first batch of the items the applied search shows

#### Scenario: The new view reaches its own end

- **WHEN** the reader scrolls or activates Load more to the end of a changed view
- **THEN** the list shows exactly the items of that view and none from the previous view

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

### Requirement: The category cell presents the category as a coloured pill

The system SHALL present each row's category as a pill-shaped labelled control carrying the category's colour from the application category palette as its identifying colour. An uncategorised row SHALL use a neutral pill naming the absence. The pill SHALL keep the category name readable and SHALL NOT convey the category by colour alone.

#### Scenario: A categorised row carries a coloured category pill

- **WHEN** a returned transaction carries a category
- **THEN** its category cell shows a pill carrying that category's palette colour and the category's name

#### Scenario: An uncategorised row carries a neutral pill

- **WHEN** a returned transaction has no category
- **THEN** its category cell shows a neutral pill naming `Uncategorised`, and no category colour or invented category is shown

#### Scenario: The pill text is legible

- **WHEN** a pill is rendered with a category colour
- **THEN** the category name remains readable against the pill's ground and is not conveyed by colour alone

### Requirement: The category pill remains the assignment control

The system SHALL keep the row's category control as the manual category assignment control defined by `manual-category-assignment`. It SHALL keep its choices, disabled state, and accessible name, SHALL NOT add a second assignment path, and SHALL keep the manual-assignment and update markers visible.

#### Scenario: The pill remains the assignment control

- **WHEN** the user inspects or operates a row's category pill
- **THEN** it still offers every stored category and the Uncategorised choice, exposes the category choice for that row to assistive technology, and assigns a chosen category through the existing manual assignment path

#### Scenario: The pill keeps the assignment markers

- **WHEN** a row is being updated or carries a manual assignment
- **THEN** its update marker or manual-assignment marker remains visible beside the pill

#### Scenario: Hidden categories keep their label

- **WHEN** the category choices include a hidden category
- **THEN** the pill's option list still marks that category as hidden

### Requirement: The table orders its columns for scanning

The system SHALL present the selection-control column first, followed in order by booking date, value date, purpose, counterparty name, counterparty account, person, category, and amount, so that the amount closes each row. This order SHALL NOT change which transaction value a column holds, which header sorts a column, or any value shown.

#### Scenario: The columns follow the screen order

- **WHEN** the table header is read from left to right
- **THEN** it presents the selection control, booking date, value date, purpose, counterparty name, counterparty account, person, category, and amount in that order

#### Scenario: The amount closes the row

- **WHEN** a row is read from left to right
- **THEN** its amount is the last value shown and is aligned with the amount header

#### Scenario: Values keep their own columns

- **WHEN** a transaction is shown after the order change
- **THEN** each value appears in the column for that element and in no other column

#### Scenario: Sorting follows the header identity

- **WHEN** the user activates a column header after the order change
- **THEN** the table sorts by that header's column and does not sort by its position in the row

### Requirement: Transactions headings and summary use the mock's type scale

The Transactions title SHALL be 34px, 800 weight, and −0.02em tracking at desktop widths, and 28px and 800 weight at mobile widths. The summary line beneath it SHALL be 15px at desktop widths and 14px at mobile widths, with the count and sum sharing that size.

#### Scenario: Desktop title metrics

- **WHEN** the Transactions screen is rendered at a desktop width
- **THEN** the title computes to 34px, 800 weight, and −0.02em letter spacing

#### Scenario: Mobile title metrics

- **WHEN** the Transactions screen is rendered at a mobile width
- **THEN** the title computes to 28px and 800 weight

#### Scenario: Summary metrics follow the width

- **WHEN** the summary line is rendered
- **THEN** it computes to 15px at desktop widths and 14px at mobile widths, and the count and sum use the same size

### Requirement: Transactions filter labels and controls use the mock's type scale

Filter labels SHALL be 12px and 700 weight. Search fields and selects SHALL be 14px at desktop widths, and the mobile search field SHALL be 15px. Primary actions SHALL be 14px and 700 weight. The Clear and Dismiss actions SHALL keep readable interface type consistent with the surrounding controls.

#### Scenario: Filter labels are bold captions

- **WHEN** a filter label is rendered
- **THEN** it computes to 12px and 700 weight

#### Scenario: Fields use the design's size

- **WHEN** the search field or a filter select is rendered at a desktop width
- **THEN** its text computes to 14px, and the mobile search field text computes to 15px

#### Scenario: Primary actions are bold

- **WHEN** the Search action or another primary action is rendered
- **THEN** its text computes to 14px and 700 weight

### Requirement: Transactions page sections use the mock's gap

The Transactions page SHALL separate its title block, filter sheet, filter note, and table region with a 24px gap at desktop widths and a 14px gap at mobile widths.

#### Scenario: Desktop section gap

- **WHEN** the Transactions screen is rendered at a desktop width
- **THEN** adjacent page sections are separated by 24px

#### Scenario: Mobile section gap

- **WHEN** the Transactions screen is rendered at a mobile width
- **THEN** adjacent page sections are separated by 14px

### Requirement: Transactions sheets use the mock's rounded dimensions

The Transactions filter and table sheets SHALL use a 20px corner radius at desktop widths and 18px at mobile widths. The filter sheet SHALL use 20px vertical and 24px horizontal padding at desktop and 14px padding at mobile. The table sheet SHALL use 8px top, 24px horizontal, and 16px bottom padding at desktop. The sheets SHALL retain the surface-over-paper separation.

#### Scenario: Desktop filter sheet dimensions

- **WHEN** the filter sheet is rendered at a desktop width
- **THEN** it computes to a 20px corner radius with 20px vertical and 24px horizontal padding

#### Scenario: Desktop table sheet dimensions

- **WHEN** the table sheet is rendered at a desktop width
- **THEN** it computes to a 20px corner radius with 8px top, 24px horizontal, and 16px bottom padding

#### Scenario: Mobile sheet dimensions

- **WHEN** either sheet is rendered at a mobile width
- **THEN** it computes to an 18px corner radius, and the filter sheet uses 14px padding

### Requirement: Transactions sheets rest elevated at every width

At every viewport width the Transactions filter and table sheets SHALL carry the shadow `0 1px 3px rgba(40, 30, 120, 0.08)`. The fixed action bars SHALL keep a stronger upward shadow because they float above the table.

#### Scenario: Sheets rest elevated at every width

- **WHEN** either Transactions sheet is rendered at a phone, tablet, or desktop width
- **THEN** its computed box shadow is `0 1px 3px rgba(40, 30, 120, 0.08)`

#### Scenario: Floating bars keep their stronger elevation

- **WHEN** a fixed action bar is shown on the Transactions screen
- **THEN** it keeps its stronger upward shadow and is not changed to the sheet shadow

### Requirement: Transaction controls use the mock's height, padding, and corner radius

Search fields, filter selects, and page action buttons on the Transactions screen SHALL be 44px high at desktop widths and 48px at mobile widths, with a 12px corner radius. Search fields SHALL use 16px horizontal padding at desktop and 14px at mobile; filter selects SHALL use 14px and 12px; primary buttons SHALL use 22px and 18px. These controls SHALL retain a hit area at least 44px high. The category pill is governed by its own requirement.

#### Scenario: Desktop control metrics

- **WHEN** a Transactions search field, filter select, or page action button is rendered at a desktop width
- **THEN** it computes to 44px high and a 12px corner radius, with the design's horizontal padding for its kind

#### Scenario: Mobile control metrics

- **WHEN** a Transactions search field, filter select, or page action button is rendered at a mobile width
- **THEN** it computes to 48px high and a 12px corner radius, with the design's horizontal padding for its kind

#### Scenario: Hit areas remain large enough

- **WHEN** any of these Transactions controls is operated by touch
- **THEN** its hit area is at least 44 CSS pixels high

### Requirement: The transaction table uses the mock's type scale

The table SHALL set ordinary body text at 14px. Header cells SHALL set 12px, 700 weight, uppercase text with 0.06em tracking. Booking dates SHALL use 600 weight and amounts 700 weight.

#### Scenario: Header typography

- **WHEN** the table header is rendered
- **THEN** its labels compute to 12px, 700 weight, uppercase, with 0.06em tracking

#### Scenario: Body type

- **WHEN** an ordinary body cell is rendered
- **THEN** its text computes to 14px

#### Scenario: Row figures carry the design's weights

- **WHEN** a booking date and an amount are rendered
- **THEN** the booking date computes to 600 weight and the amount to 700 weight

### Requirement: The transaction table uses the mock's cell metrics

Header cells SHALL use 8px horizontal padding. Ordinary body cells SHALL use 13px vertical and 8px horizontal padding; cells whose own control supplies a 44px hit area SHALL use 8px horizontal padding and no vertical padding. The header row SHALL remain about 48px high while each sortable header keeps a 44px hit area.

#### Scenario: Ordinary cell metrics

- **WHEN** an ordinary body cell is rendered
- **THEN** it uses 13px vertical and 8px horizontal padding

#### Scenario: Control cells stay compact

- **WHEN** a body cell holds the selection or category control
- **THEN** it uses 8px horizontal padding and no vertical padding, and its control supplies a 44px hit area

#### Scenario: Header height and hit area are reconciled

- **WHEN** the sortable header row is rendered
- **THEN** the row is about 48px high and each header activation control has a hit area at least 44px high

### Requirement: The category pill uses the mock's type and padding

The category pill SHALL set its label at 12px and 700 weight with 5px vertical and 12px horizontal padding, on the pill radius. The visible pill SHALL keep that compact size while the row keeps a hit area at least 44px high for the assignment control.

#### Scenario: Pill metrics

- **WHEN** a categorised or uncategorised category pill is rendered
- **THEN** its label computes to 12px and 700 weight with 5px vertical and 12px horizontal padding

#### Scenario: Assignment control keeps its hit area

- **WHEN** the category assignment control is operated by touch
- **THEN** its hit area is at least 44 CSS pixels high even though the visible pill is compact

### Requirement: The empty state is centred and sized to the mock

When the Transactions table has no rows to show, the empty-state message SHALL be centred within the table sheet at 14px with 40px vertical padding. The failure and loading states SHALL keep their current meaning and SHALL use the interface type scale.

#### Scenario: Empty state metrics

- **WHEN** the active view matches no transaction
- **THEN** the empty-state message is centred, computes to 14px, and has 40px vertical padding

#### Scenario: Non-empty states keep their meaning

- **WHEN** the request is loading or has failed
- **THEN** the loading or failure state remains distinct from the empty state and uses the interface type scale

### Requirement: The phone transaction list uses the mock's card presentation

At phone widths the system SHALL present each transaction as a surface card with the purpose and amount on its top row, the category pill below, and the booking and value dates in a meta row. The card SHALL use an 18px corner radius, the theme's resting shadow, 16px padding, and a 10px internal gap. The counterparty name, counterparty account, and person SHALL remain visible in the card.

#### Scenario: The card follows the mobile mock's arrangement

- **WHEN** a transaction card is rendered at a phone width
- **THEN** its purpose and amount share the top row, its category pill follows, and its booking and value dates share the meta row

#### Scenario: Every transaction value remains on the card

- **WHEN** a card is inspected
- **THEN** it shows the booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category or its explicit absence

#### Scenario: The card uses the mock's surface metrics

- **WHEN** a card is rendered at a phone width
- **THEN** it has an 18px corner radius, the theme's resting shadow, 16px padding, and a 10px gap between its inner rows

#### Scenario: The amount stays ink-coloured

- **WHEN** a card shows a positive or negative amount
- **THEN** the amount is rendered in the theme's ink colour with its sign and no income or failure colour

#### Scenario: An absent account is an explicit gap

- **WHEN** a card's transaction has no counterparty account
- **THEN** the card shows an explicit absence rather than an empty or borrowed value

### Requirement: The phone transaction list offers selection, sorting, and explicit batching

At phone widths the system SHALL offer a selection control on each card, a select-all control in a toolbar above the cards, a labelled sort control listing the eight value columns, and a direction control. It SHALL show a Load more button while more matching transactions remain and SHALL hide it once every matching transaction is presented. These controls SHALL keep a touch target at least 44 CSS pixels high.

#### Scenario: A card can be selected and select-all covers the view

- **WHEN** the reader activates a card's selection control or the toolbar's select-all control
- **THEN** that card or every shown card becomes selected, and the bulk bar states the resulting count

#### Scenario: The phone sort control sets the column and direction

- **WHEN** the reader chooses a column in the sort control and uses the direction control
- **THEN** the cards are ordered by that column and direction, and the active sort is exposed to assistive technology

#### Scenario: Load more appends a batch and then disappears

- **WHEN** the reader activates Load more while more matching transactions remain and then continues until none remain
- **THEN** each activation appends the next batch after the existing cards, and the control is no longer shown at the end

#### Scenario: The mobile controls meet the touch target

- **WHEN** a card selection, select-all, sort, direction, or Load more control is rendered at a phone width
- **THEN** its hit area is at least 44 CSS pixels high

### Requirement: The phone Transactions filter sheet follows the mock's compact arrangement

At phone widths the Transactions filter sheet SHALL place the search field and Search action on one row, the Person and Period controls side by side, and the Category control full width. The labels SHALL remain available to assistive technology, and the search field, selects, and Search action SHALL keep their 48px height and 12px corner radius.

#### Scenario: The search field and action share a row

- **WHEN** the filter sheet is rendered at a phone width
- **THEN** the search field and Search action occupy the same row, with the field taking the remaining width

#### Scenario: Person and Period share a row and Category spans it

- **WHEN** the filter sheet is rendered at a phone width
- **THEN** the Person and Period controls sit side by side and the Category control spans the full width beneath them

#### Scenario: The labels remain accessible

- **WHEN** a phone filter control is inspected by assistive technology
- **THEN** it has an accessible name, even when the visible caption is compact

#### Scenario: The mobile filter controls keep their design metrics

- **WHEN** the search field, a select, or the Search action is rendered at a phone width
- **THEN** it is 48px high with a 12px corner radius

### Requirement: The transactions screen links to category management

The transactions screen SHALL carry an in-application link labelled `Manage categories` to the category management screen. The link SHALL sit with the Category filter and remain visible at phone and desktop widths. At phone widths its hit area SHALL be at least 44 CSS pixels high. The link SHALL NOT change the Category filter's choices, defaults, query values, or filtering, and the search, Person, Period, and Category controls SHALL keep the arrangement their requirements define.

#### Scenario: The link reaches the category screen

- **WHEN** the transactions screen is shown and the `Manage categories` link is followed
- **THEN** the category management screen is reached through in-application navigation on the same origin

#### Scenario: The link fits a phone width

- **WHEN** the transactions screen is shown at a 320 CSS-pixel viewport width
- **THEN** the link remains visible beside the Category filter with a hit area at least 44 CSS pixels high, and the page has no horizontal overflow

#### Scenario: The link leaves filtering unchanged

- **WHEN** the transactions screen is rendered with the link
- **THEN** the Category filter's choices, default, query values, and filtering behavior are those defined by the category-presence filter requirement
