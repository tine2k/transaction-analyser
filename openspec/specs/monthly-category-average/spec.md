# Monthly Category Average Specification

## Purpose

Provides a read-only summary of each category's average monthly absolute spend over a configurable recent window, so categories can be compared at a glance without reading month by month.

## Requirements

### Requirement: The monthly average route presents each category's average monthly spend

The system SHALL provide a menu-accessible page at `/monthly-average` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. It SHALL use the returned transactions as its only transaction data source. The page SHALL exclude every returned transaction whose category is hidden before it forms any average: a hidden-category transaction SHALL NOT contribute to any category's sum or average, and a hidden category SHALL NOT be listed.

The page SHALL cover a rolling window of the last configured number of calendar months, ending with the calendar month that contains the current date. The window SHALL default to 12 months. For each category represented by at least one included returned transaction whose booking date falls within the window, the page SHALL show the category's name and its average monthly absolute spend over the window. The page SHALL include a distinct `Uncategorised` entry when an included returned transaction within the window has no category, and SHALL list every such represented category without dropping any. The page SHALL allow the user to select either the category name or average amount as the sort column and ascending or descending as the direction. On initial load, results SHALL be sorted by average amount descending. Amount sorting SHALL compare the numeric average amounts, and categories with equal amounts SHALL retain the existing stable category order: named categories ordered case-insensitively by name with category identity ascending as a tie-breaker, followed by `Uncategorised`. Category sorting SHALL compare names case-insensitively in the selected direction, use category identity ascending to break equal-name ties, and place `Uncategorised` after named categories in either direction.

The average monthly amount for a category SHALL be the exact sum of the absolute amounts of that category's included transactions whose booking date falls within the window, divided by the configured number of months, so that a month in the window with no such transaction contributes zero. The average SHALL be rounded to two decimal places (the euro cent), with a half rounded away from zero, and SHALL be displayed using the browser's active locale's EUR currency and number conventions. Incoming and outgoing amounts SHALL both contribute positively. The page SHALL NOT change stored data, SHALL NOT combine transactions across categories, and SHALL NOT include transactions whose booking date falls outside the window.

#### Scenario: Categories are listed with their monthly averages

- **WHEN** returned transactions have booking dates in several recent calendar months and named categories
- **THEN** the page lists each represented category with its name and its average monthly absolute spend over the window

#### Scenario: The window ends at the current month

- **WHEN** the current date is in one calendar month and returned transactions span earlier and later months
- **THEN** the window covers the current month and the preceding configured number of months, and transactions outside it do not affect any average

#### Scenario: A month with no transactions counts as zero

- **WHEN** a category has a transaction of `-12.00` in one window month and no transactions in the other window months, with a window of `12`
- **THEN** its average is shown as the exact value `1.00`

#### Scenario: Amounts are absolute and rounded to the cent

- **WHEN** a category has incoming and outgoing amounts whose window sum divided by the configured months is not an exact cent value
- **THEN** the average is formed from the absolute sum and rounded to two decimal places, halves away from zero

#### Scenario: A hidden category is excluded from the averages

- **WHEN** a returned transaction within the window has a hidden category
- **THEN** it contributes to no category's sum or average, and its hidden category is not listed

#### Scenario: Hiding a category leaves other averages unchanged

- **WHEN** a hidden category and a visible category both have window transactions
- **THEN** the visible category's average is unchanged and only the hidden category is omitted

#### Scenario: Uncategorised is listed separately

- **WHEN** returned transactions within the window have named categories and uncategorised transactions
- **THEN** the page lists an entry for each represented named category and one separate `Uncategorised` entry, and invents no category

#### Scenario: Amount-descending order is the default

- **WHEN** the monthly average page loads with categories whose average amounts differ
- **THEN** categories appear from the greatest average amount to the least

#### Scenario: Amount sorting supports both directions

- **WHEN** the user selects average amount as the sort column and chooses ascending or descending
- **THEN** all listed categories are ordered by their numeric average amount in the selected direction, with equal amounts retaining the stable category order

#### Scenario: Category sorting supports both directions

- **WHEN** the user selects category as the sort column and chooses ascending or descending
- **THEN** named categories are ordered case-insensitively by name in the selected direction, equal names are ordered by category identity ascending, and `Uncategorised` follows named categories

#### Scenario: Empty data has no category entries

- **WHEN** the request succeeds but returns no transaction with a booking date inside the window
- **THEN** the page shows no category entries and states that there is no category data

#### Scenario: Loading and request failure are distinct from empty data

- **WHEN** the transaction request is pending or fails
- **THEN** the page shows an appropriate loading or failure state and does not present the result as an empty list or display stale averages

#### Scenario: The page uses only the existing read endpoint

- **WHEN** the monthly average page loads or is used
- **THEN** it makes one same-origin transaction read request, makes no additional data request, and creates, alters, or deletes no stored data

### Requirement: The averaging window is configurable on the page

The page SHALL provide a control that sets the number of months in the averaging window, defaulting to 12. The control SHALL accept a positive whole number of months. Changing the value SHALL recompute every displayed category average from the already-fetched transactions and SHALL NOT make a further data request. When the entered value is empty or not a positive whole number, the page SHALL retain the last valid month count and SHALL NOT present an undefined average. The page SHALL state the currently applied number of months so the displayed averages can be read against it.

#### Scenario: The default window is twelve months

- **WHEN** the page is first loaded
- **THEN** the control shows 12 months and the averages use a twelve-month window

#### Scenario: Changing the window recomputes the averages

- **WHEN** the user changes the control to another positive whole number of months
- **THEN** every category average is recomputed over that window using the already-fetched transactions, without a new data request

#### Scenario: An invalid window does not change the averages

- **WHEN** the control is emptied or given a value that is not a positive whole number
- **THEN** the page keeps the last valid month count and continues to show the averages for that window

#### Scenario: The applied window is stated

- **WHEN** the page shows category averages
- **THEN** it states the number of months currently applied to those averages

### Requirement: The monthly average page offers a page-wide expense-type filter

The monthly average page SHALL offer a page-wide control that selects which expense types are
shown: `All`, `Recurring`, or `One-time`. The control SHALL default to `All` and SHALL be
independent of the month-count window. Changing the selection SHALL recompute every average from
the already-fetched transactions without another data request, and SHALL NOT change stored data.
With `All` selected the page SHALL present exactly what it presents without the control.

#### Scenario: All is the default

- **WHEN** the monthly average page loads
- **THEN** the expense-type control reads `All`

#### Scenario: All preserves the existing list

- **WHEN** `All` is selected
- **THEN** the same category entries with the same averages are presented as without the control

#### Scenario: The filter and the window are independent

- **WHEN** the month-count window changes
- **THEN** the selected expense type stays in effect, and changing the expense type leaves the window unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the selection changes
- **THEN** every average is recomputed from the already-fetched transactions and no additional data request is made

### Requirement: The expense-type filter selects which transactions contribute to the averages

With `Recurring` or `One-time` selected, only transactions whose category's expense type equals
the selection SHALL contribute to any category's sum or average, and only such categories SHALL be
listed. A transaction whose category carries no expense type, and an uncategorised transaction,
SHALL contribute only while `All` is selected. A hidden-category transaction SHALL contribute
under no selection.

#### Scenario: Only the selected type is listed

- **WHEN** `Recurring` is selected and a category's expense type is one-time
- **THEN** the category is not listed and its transactions contribute to no sum or average

#### Scenario: An unset category is listed only under All

- **WHEN** a category carrying no expense type has window transactions and `One-time` is selected
- **THEN** the category is not listed, and under `All` it is listed with its usual average

#### Scenario: Uncategorised is listed only under All

- **WHEN** `Recurring` is selected and a transaction has no category
- **THEN** no `Uncategorised` entry is listed and uncategorised amounts contribute to no average

#### Scenario: A hidden category stays excluded

- **WHEN** a hidden category's expense type matches the selected choice
- **THEN** it is not listed and its transactions contribute to no sum or average

#### Scenario: A filtered list without data is explained

- **WHEN** the selection leaves no eligible transaction within the window
- **THEN** the page shows no category entries and states that there is no category data

### Requirement: The monthly average page offers a page-wide person filter

The monthly average page SHALL offer a page-wide person filter selecting `All people` or one person
represented in the returned transactions. It SHALL default to `All people` and be independent of the
month-count window and expense-type controls. Changing it SHALL recompute every average from the
already-fetched transactions without another request. The selection SHALL be carried in the route
query as `person=<id>`; an absent or unknown person SHALL mean all people.

#### Scenario: All people is the default

- **WHEN** the monthly average page loads without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes every average

- **WHEN** a person is selected
- **THEN** only the returned transactions that reference that person contribute to any category's sum or average

#### Scenario: The filter is independent of the window

- **WHEN** the month-count window changes
- **THEN** the selected person stays in effect, and changing the person leaves the window unchanged

#### Scenario: The filter is independent of expense type

- **WHEN** the expense type is changed
- **THEN** the selected person stays in effect, and changing the person leaves the expense type unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the person selection changes
- **THEN** every average is recomputed from the already-fetched transactions and no additional data request is made

#### Scenario: The selection is linkable

- **WHEN** the monthly average route is opened with `person=<id>` naming a represented person
- **THEN** the person control selects that person and the list shows only that person's averages

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** the person control selects all people

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers all people and each person represented in the returned transactions, and it makes no request other than the existing transaction read

#### Scenario: A person with no data is explained

- **WHEN** the selected person has no eligible transaction within the window
- **THEN** the page shows no category entries and states that there is no category data

### Requirement: The monthly average page presents a category comparison table

The page SHALL present each listed category as a card below the `sm` breakpoint and as a row in a semantic comparison table from `sm` up. Each presentation SHALL show the category, the configured window's monthly trend, the average monthly amount and its relative bar, the exact window total, and the exact average per month. The category name SHALL carry a mark from the single category palette. The trend and total labels and the subtitle SHALL state the applied number of months. In the card presentation the window total and average per month SHALL be labelled as text, the trend and average bar SHALL be hidden from assistive technology, and no exact value SHALL be available only through horizontal scrolling.

#### Scenario: Every listed category has a comparison row

- **WHEN** the page lists categories for the configured window
- **THEN** each category appears once, as a card below the `sm` breakpoint and as a table row from `sm` up, with its name, trend, average, window total, and average per month

#### Scenario: A phone shows one card per category

- **WHEN** the comparison is shown below the `sm` breakpoint
- **THEN** each category card shows its name and palette mark, its monthly trend bars, its relative average bar, a labelled exact window total, and a labelled exact average per month

#### Scenario: The average bar is relative to the largest average

- **WHEN** listed categories have different average monthly amounts
- **THEN** the category with the largest average draws a full bar, every other bar is proportional to it, and a zero average draws no fill

#### Scenario: The window total and average are exact

- **WHEN** a category has included transactions in several window months
- **THEN** its window total is the exact sum of its absolute monthly totals, and its average per month is that total divided by the applied months and rounded to the euro cent

#### Scenario: The labels follow the applied window

- **WHEN** the applied window is 6 months
- **THEN** the trend and total labels, the card labels, and the subtitle state 6 months, and no label claims 12 months

#### Scenario: The table is semantic

- **WHEN** the comparison table is inspected from the `sm` breakpoint up
- **THEN** it has a caption, column headers, and one row per category, and every displayed amount is present as text

#### Scenario: The card presentation keeps the exact values as text

- **WHEN** a category card is inspected below the `sm` breakpoint
- **THEN** its window total and average per month are present as text, and the hidden trend and bar are not the only carrier of either value

### Requirement: The category comparison table shows a per-month trend

The table SHALL show, for each category, one bar for each month in the configured window in chronological order. Each bar's height SHALL be relative to that category's largest month in the window. A month with no included transaction SHALL show a minimum bar rather than a missing bar. The trend SHALL be a visual summary: the exact window total and average SHALL remain available as text, and the trend SHALL be hidden from assistive technology.

#### Scenario: One bar is shown for every window month

- **WHEN** the applied window is 12 months
- **THEN** each category row shows 12 bars in chronological order, oldest month first

#### Scenario: A month without spend keeps a bar

- **WHEN** a category has no included transaction in one window month
- **THEN** that month's bar is shown at the minimum height and the month is not omitted

#### Scenario: The largest month sets the row scale

- **WHEN** a category's monthly totals differ within the window
- **THEN** its largest month draws the tallest bar in that row, and another category's scale does not affect it

#### Scenario: The window length changes the bar count

- **WHEN** the applied window changes from 12 to 6 months
- **THEN** every category row shows 6 bars for the new window

#### Scenario: Hidden categories do not shape a trend

- **WHEN** a transaction within the window belongs to a hidden category
- **THEN** it contributes to no bar, total, or average, and its category has no row

#### Scenario: The trend is not the only carrier

- **WHEN** the trend is unavailable to assistive technology
- **THEN** the category's exact window total and average per month remain present in the row as text

### Requirement: The monthly average page shows window summary figures

The page SHALL show three summary figures: the average per month for the current person and expense-type selection, the recurring per month for the selected person, and the one-time per month for the selected person. Each figure SHALL be the exact absolute window sum divided by the applied months, rounded to the cent, and SHALL update from the already-fetched transactions without another request. The typed figures SHALL NOT be presented as a partition of the all-types figure.

#### Scenario: The three figures are shown

- **WHEN** the page shows category averages
- **THEN** it shows the current-selection average per month, the recurring per month, and the one-time per month

#### Scenario: The current-selection figure follows the expense type

- **WHEN** the expense-type selection changes from All to Recurring
- **THEN** the current-selection figure reflects only recurring-category transactions

#### Scenario: The typed figures follow the person but not the expense type

- **WHEN** the expense-type selection changes
- **THEN** the recurring and one-time figures stay the same, and changing the person recomputes both

#### Scenario: Typed figures cover typed categories only

- **WHEN** the selected person has uncategorised transactions or transactions in categories carrying no expense type
- **THEN** those transactions contribute to the current-selection figure but to neither typed figure

#### Scenario: Hidden categories contribute to no figure

- **WHEN** a hidden category has transactions within the window
- **THEN** its amounts contribute to none of the three figures

#### Scenario: Changing the window recomputes every figure

- **WHEN** the applied window changes to another positive whole number of months
- **THEN** every summary figure is recomputed over the new window without another data request

#### Scenario: Empty data shows zero figures

- **WHEN** no included transaction falls within the window
- **THEN** the three summary figures show zero and the page states that there is no category data

### Requirement: The comparison table reports its active sort

From the `sm` breakpoint up the table SHALL report the active sort column and direction through the sorted column header's sort state and a visible direction mark. Below `sm` the card list SHALL state the active sort column and direction as text beside the sort controls. The existing sort-column and sort-direction controls SHALL remain the controls that change the sort at every width.

#### Scenario: The default sort is reported

- **WHEN** the page first shows the comparison from the `sm` breakpoint up
- **THEN** the average-per-month column reports descending order and carries the descending mark

#### Scenario: A sort change is reported

- **WHEN** the user selects category as the sort column and ascending as the direction
- **THEN** the category column reports ascending order and carries the ascending mark, and no other column reports a sort

#### Scenario: The header is not a second sort control

- **WHEN** the user activates a column header
- **THEN** the sort does not change, because the sort controls remain the only controls that set it

#### Scenario: The phone card list states the active sort

- **WHEN** the comparison is shown below the `sm` breakpoint
- **THEN** a visible statement beside the sort controls names the active sort column and direction and updates when either changes

#### Scenario: The phone controls still change the sort

- **WHEN** the user changes the sort column or direction below the `sm` breakpoint
- **THEN** the cards reorder to match, and the visible sort statement names the new column and direction

