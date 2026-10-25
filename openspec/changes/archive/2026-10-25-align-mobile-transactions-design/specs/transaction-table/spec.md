# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: The phone transaction list uses the mock's card presentation

At phone widths the system SHALL present each transaction as a surface card with the purpose and amount on its top row, the category pill below, and the booking and value dates in a meta row. The card SHALL use an 18px corner radius, flat elevation, 16px padding, and a 10px internal gap. The counterparty name, counterparty account, and person SHALL remain visible in the card.

#### Scenario: The card follows the mobile mock's arrangement

- **WHEN** a transaction card is rendered at a phone width
- **THEN** its purpose and amount share the top row, its category pill follows, and its booking and value dates share the meta row

#### Scenario: Every transaction value remains on the card

- **WHEN** a card is inspected
- **THEN** it shows the booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category or its explicit absence

#### Scenario: The card uses the mock's surface metrics

- **WHEN** a card is rendered at a phone width
- **THEN** it has an 18px corner radius, no resting shadow, 16px padding, and a 10px gap between its inner rows

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
