# Monthly Category Overview Specification

## Purpose

Defines the browser Monthly screen that presents one selected calendar month's absolute transaction totals by category, its summary figures, and its category table, without changing stored data.

## Requirements

### Requirement: The Monthly route presents one calendar month from the transaction read

The system SHALL provide a browser page at `/monthly` that requests the same-origin `GET /api/transactions` endpoint once per page load and uses the returned transactions as its only transaction data source. The page SHALL present one selected calendar month at a time and SHALL NOT combine transactions across months.

#### Scenario: The route loads its data once

- **WHEN** the `/monthly` route is shown
- **THEN** it makes one same-origin `GET /api/transactions` request and derives the page from that response

#### Scenario: Only the selected month contributes

- **WHEN** returned transactions have booking dates in several calendar months
- **THEN** only transactions whose booking date falls in the selected month contribute to any figure, bar segment, or table row

### Requirement: The Monthly year control ends at the current year

The page SHALL offer a year control for choosing the displayed calendar year. It SHALL offer every calendar year represented by a returned transaction up to the current calendar year, plus the current calendar year, newest first, and SHALL NOT offer a future year.

#### Scenario: The year control offers represented past years and the current year

- **WHEN** returned transactions have booking dates in 2024, 2025, and a future year, and the current year is 2026
- **THEN** the year control offers 2026, 2025, and 2024, newest first, and does not offer the future year

### Requirement: The Monthly month controls cover only elapsed months

For the current calendar year the month controls SHALL cover January through the calendar month containing today; for a past calendar year they SHALL cover all twelve calendar months. The month controls SHALL be present for every month in that range, including months with no transaction, and no control SHALL be offered for a future month.

#### Scenario: The current year stops at the current month

- **WHEN** the page presents the current calendar year and the current month is October
- **THEN** month controls are shown for January through October and no month control is shown for November or December

#### Scenario: A past year keeps all twelve month controls

- **WHEN** the page presents a calendar year before the current year
- **THEN** twelve month controls are shown, one for each calendar month of that year

#### Scenario: An empty elapsed month can be selected

- **WHEN** the selected year has no transaction in an offered month
- **THEN** that month's control remains available and selecting it shows the empty-month state rather than removing the control

### Requirement: The selected month is linkable and defaults to the current or newest month

The selected month SHALL be carried in the route query as `month=YYYY-MM`. A supplied well-formed month that is not a future month SHALL be selected on load and its year SHALL be available in the year control. A supplied future month SHALL be treated as an unavailable value and SHALL NOT be selected or added to the year control. An absent, malformed, or future month SHALL select the current calendar month when a returned transaction falls in it, otherwise the newest calendar month represented by a returned transaction that is not a future month, otherwise the current calendar month. Selecting a month SHALL NOT make another data request.

#### Scenario: A month link initializes the page

- **WHEN** `/monthly` is opened with `month=2025-03`
- **THEN** March 2025 is selected and its figures and table are shown

#### Scenario: The current month is the default when it has data

- **WHEN** the route carries no month and a returned transaction falls in the current calendar month
- **THEN** the current month is selected

#### Scenario: The newest represented month is the fallback

- **WHEN** the route carries no month, no returned transaction falls in the current calendar month, and returned transactions include both an elapsed month and a future month
- **THEN** the newest elapsed calendar month represented by a returned transaction is selected

#### Scenario: A future month link falls back

- **WHEN** `/monthly` is opened with a well-formed month after the current calendar month
- **THEN** the page selects the same month its current-or-newest rule would select without that value, and the year control does not offer the future month's year

#### Scenario: No transactions select the current month

- **WHEN** the endpoint returns no transaction and the route carries no month
- **THEN** the current calendar month is selected and the empty-month state is shown

#### Scenario: Selecting a month does not re-fetch

- **WHEN** the user selects another month or year
- **THEN** the page recomputes from the already-fetched transactions and makes no additional data request

### Requirement: Summary figures count the selected month

The page SHALL present two summary figures for the selected month: `Total moved`, the exact sum of the absolute amounts of included transactions, and `Transactions`, the count of included transactions. Both SHALL reflect the person and expense-type selections, SHALL exclude hidden categories and, when selected, uncategorised transactions, and SHALL use exact decimal amounts without floating-point conversion.

#### Scenario: Total moved sums absolute amounts

- **WHEN** the selected month has amounts `-12.50` and `4.00`
- **THEN** `Total moved` shows the exact value `16.50`

#### Scenario: Transactions counts included transactions

- **WHEN** the selected month has five included transactions and two excluded ones
- **THEN** `Transactions` shows `5`

#### Scenario: The figures follow the filters

- **WHEN** the person, expense type, or hide-uncategorised selection changes
- **THEN** both summary figures recompute from the already-fetched transactions without another request

#### Scenario: A hidden category contributes to neither figure

- **WHEN** a returned transaction in the selected month has a hidden category
- **THEN** its amount and its transaction are absent from `Total moved` and `Transactions`

#### Scenario: An empty month shows zero figures

- **WHEN** the selected month has no included transaction
- **THEN** `Total moved` shows zero and `Transactions` shows `0`

### Requirement: Categories are listed with exact absolute totals

The page SHALL list every category represented by an included transaction in the selected month, including a distinct `Uncategorised` entry when an included transaction has no category. Each entry's amount SHALL be the exact sum of the absolute amounts of that category's included transactions. Entries SHALL be ordered from greatest amount to least, with equal amounts ordered by category name ascending, and a zero amount SHALL remain listed with no share bar.

#### Scenario: Both signs contribute positively

- **WHEN** a category has amounts `-12.50` and `4.00` in the selected month
- **THEN** its entry shows the exact total `16.50`

#### Scenario: Uncategorised is listed separately

- **WHEN** an included transaction in the selected month has no category
- **THEN** a distinct `Uncategorised` entry is listed

#### Scenario: Entries are ordered by amount

- **WHEN** listed categories have different exact totals
- **THEN** they appear from greatest to least, and equal totals appear by category name ascending

#### Scenario: A zero amount remains listed

- **WHEN** a represented category's transactions sum to zero
- **THEN** the category remains in the list with amount zero and no share fill

### Requirement: The stacked bar shows the top eight categories and the rest

The page SHALL present a stacked bar for the selected month whose segments are the eight categories with the greatest amounts, followed by one `Other N` segment aggregating every remaining category, where N is the number of remaining categories. Each segment's width SHALL be proportional to its amount. When eight or fewer categories are listed, no `Other` segment SHALL appear. The bar SHALL have a legend naming each segment and its exact amount.

#### Scenario: More than eight categories produce an Other segment

- **WHEN** the selected month lists ten categories
- **THEN** the bar shows eight category segments and one `Other 2` segment

#### Scenario: Eight or fewer categories produce no Other segment

- **WHEN** the selected month lists six categories
- **THEN** the bar shows six category segments and no `Other` segment

#### Scenario: Segment widths follow amounts

- **WHEN** one segment's amount is twice another's
- **THEN** its width is twice as large

#### Scenario: A month with no amount shows no segments

- **WHEN** no included transaction in the selected month has a nonzero absolute total
- **THEN** the bar shows no segments

### Requirement: The category table shows share, transactions, and amount

The page SHALL present a table with one row per listed category and the columns Category, Share of top category, Transactions, and Amount. Share SHALL be the category's amount as a percentage of the greatest category amount, with the greatest at 100%. Transactions SHALL be the count of included transactions in that category. Amount SHALL be the exact absolute total in the browser's locale EUR format. When the greatest category amount is zero, no row SHALL show a share fill.

#### Scenario: The largest category is the full share

- **WHEN** the greatest category amount is `100.00`
- **THEN** that category's share is `100` percent

#### Scenario: Other categories are proportional to the largest

- **WHEN** the greatest category amount is `100.00` and another category's amount is `25.00`
- **THEN** the second category's share is `25` percent

#### Scenario: The row counts its own transactions

- **WHEN** a category has three included transactions in the selected month
- **THEN** its Transactions cell shows `3`

#### Scenario: The amount uses locale EUR formatting

- **WHEN** a category's exact total is large or fractional
- **THEN** its Amount cell shows the exact value with the browser locale's EUR currency and thousands conventions, without rounding

#### Scenario: The table lists every category, not only the top eight

- **WHEN** the selected month lists ten categories
- **THEN** the table lists all ten rows while only eight appear as separate bar segments

### Requirement: Category rows link to their transactions

Each category table row SHALL link to the transactions screen at `/` with the selected month as `month=YYYY-MM`, the row's category as `category` (the category identity, or `uncategorised`), and the selected person as `person=<id>` when one is selected. When all people are selected, the link SHALL carry no person value. Following a row link SHALL only read existing data.

#### Scenario: A named category row opens matching transactions

- **WHEN** a category row for category identity `7` is activated
- **THEN** the transactions screen opens with that month, category `7`, and the selected person selected

#### Scenario: The uncategorised row opens uncategorised transactions

- **WHEN** the `Uncategorised` row is activated
- **THEN** the transactions screen opens with that month, the uncategorised filter, and the selected person selected

#### Scenario: All people omits the person value

- **WHEN** all people are selected and a category row is activated
- **THEN** the transactions screen opens with no person filter

#### Scenario: Row navigation changes no stored data

- **WHEN** a category row link is activated
- **THEN** no transaction, category, or person is created, altered, or deleted

### Requirement: The Monthly page offers a person filter

The page SHALL offer a page-wide person filter selecting `All people` or one person represented in the returned transactions. It SHALL default to `All people`, be independent of the month and expense-type selections, and carry the selection in the route query as `person=<id>`. An absent or unknown person SHALL mean all people. Changing the person SHALL recompute every figure from the already-fetched transactions without another request.

#### Scenario: All people is the default

- **WHEN** `/monthly` is shown without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes every figure

- **WHEN** a person is selected
- **THEN** only that person's transactions contribute to the summary, bar, table, and transaction count

#### Scenario: The selection is linkable

- **WHEN** `/monthly` is opened with `person=<id>` naming a represented person
- **THEN** that person is selected and only their transactions contribute

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** `All people` is selected

#### Scenario: Changing the person does not re-fetch

- **WHEN** the person selection changes
- **THEN** every figure recomputes from the already-fetched transactions and no additional data request is made

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers `All people` and each person represented in the returned transactions, and no other request is made

### Requirement: The Monthly page offers an expense-type filter

The page SHALL offer a page-wide expense-type filter with `All`, `Recurring`, and `One-time`, defaulting to `All`. With a typed selection, only transactions whose category carries that expense type SHALL contribute; uncategorised transactions and categories with no expense type SHALL contribute only under `All`. Changing the selection SHALL recompute every figure without another request and SHALL NOT change stored data.

#### Scenario: All is the default

- **WHEN** `/monthly` loads
- **THEN** the expense-type control reads `All`

#### Scenario: A typed selection excludes other types

- **WHEN** `Recurring` is selected and a transaction's category is one-time
- **THEN** that transaction contributes to no figure, bar segment, table row, or count

#### Scenario: An unset category contributes only under All

- **WHEN** a category carries no expense type
- **THEN** it contributes only while `All` is selected

#### Scenario: Uncategorised contributes only under All

- **WHEN** `Recurring` is selected and a transaction has no category
- **THEN** it contributes to no figure, bar segment, table row, or count

#### Scenario: The filter is independent of the person

- **WHEN** the expense type changes
- **THEN** the selected person stays in effect, and changing the person leaves the expense type unchanged

#### Scenario: Selecting an expense type does not re-fetch

- **WHEN** the expense-type selection changes
- **THEN** every figure recomputes from the already-fetched transactions and no additional data request is made

### Requirement: The hide-uncategorised control scopes the whole page

The page SHALL offer a control that hides or shows the `Uncategorised` category, shown by default. When hidden, uncategorised transactions SHALL contribute to no summary figure, bar segment, table row, or transaction count on the page. Clearing the control SHALL restore them. The control SHALL NOT change stored data.

#### Scenario: Uncategorised is shown by default

- **WHEN** `/monthly` loads
- **THEN** the hide control is cleared and the `Uncategorised` row and amounts are shown where present

#### Scenario: Hiding uncategorised updates every figure

- **WHEN** the hide control is selected
- **THEN** uncategorised transactions are absent from `Total moved`, `Transactions`, the bar, the table, and the category count

#### Scenario: Showing uncategorised restores every figure

- **WHEN** the hide control is cleared
- **THEN** uncategorised transactions contribute again everywhere they are represented

#### Scenario: The control changes no stored data

- **WHEN** the hide control is used
- **THEN** no transaction or category is created, altered, or deleted

### Requirement: The Monthly page distinguishes loading, failure, and empty data

While transactions are requested the page SHALL show a loading state. If the request fails it SHALL state that the monthly data could not be loaded and SHALL NOT present the failure as an empty month or stale figures. If the selected month has no included transaction, the page SHALL show zero summary figures, no bar segments, and explain that there is no category data for that month.

#### Scenario: Loading is distinct from empty data

- **WHEN** the transaction request is pending
- **THEN** the page shows a loading state and does not present zero figures as an empty result

#### Scenario: A failed request is reported

- **WHEN** the transaction request fails
- **THEN** the page reports that the monthly data could not be loaded and shows no stale figures

#### Scenario: An empty month is explained

- **WHEN** the selected month has no included transaction
- **THEN** the page shows zero summary figures, no bar segments, and states that there is no category data for that month

### Requirement: The Monthly page is read-only and invents no categories

The page SHALL only read transactions through its single `GET /api/transactions` request. It SHALL NOT create, alter, or delete transactions or categories, evaluate a category expression, make another data request, or show a category that is not represented by an included returned transaction.

#### Scenario: The page makes no write

- **WHEN** the page is loaded or its controls are used
- **THEN** no transaction, category, or person is created, altered, or deleted

#### Scenario: No category expression is evaluated

- **WHEN** the page renders categories
- **THEN** no category's regular expression is evaluated in the browser

#### Scenario: Every category comes from the response

- **WHEN** the table or bar shows a category
- **THEN** that category is represented by an included returned transaction

#### Scenario: The single read is the only data request

- **WHEN** the page loads and its filters or month change
- **THEN** its transaction data still comes from the one existing `GET /api/transactions` request

### Requirement: Hidden categories contribute to nothing

Transactions whose category is hidden SHALL contribute to no summary figure, category entry, bar segment, transaction count, or row link on the Monthly page. Hiding a category SHALL NOT change the amounts of visible categories.

#### Scenario: A hidden category is absent from the page

- **WHEN** a returned transaction in the selected month has a hidden category
- **THEN** its category appears in no bar segment or table row and its amount and transaction are absent from both summary figures

#### Scenario: Visible totals are unchanged by a hidden category

- **WHEN** a hidden category and a visible category both have transactions in the selected month
- **THEN** the visible category's amount and transaction count are the same as without the hidden category

### Requirement: Category colours are consistent within the Monthly page

The page SHALL assign each category a colour from the application category palette and SHALL use the same colour for that category in the stacked bar and its table row. A category SHALL keep its colour when the selected month, person, expense type, or uncategorised visibility changes. The `Other` segment SHALL use a neutral grey that is not a category colour and SHALL have at least 3:1 contrast against the surface; its legend swatch SHALL use the same neutral grey.

#### Scenario: The bar and table agree

- **WHEN** a category appears in both the stacked bar and the table
- **THEN** both uses the same colour

#### Scenario: A category keeps its colour across months

- **WHEN** the same category has amounts in two selected months
- **THEN** it uses the same colour in both months

#### Scenario: Filters do not change a category's colour

- **WHEN** the person, expense type, or uncategorised visibility changes
- **THEN** every visible category keeps the colour it had before

#### Scenario: Other is neutral

- **WHEN** the bar shows an `Other N` segment
- **THEN** that segment does not use a category colour

#### Scenario: Other remains visible

- **WHEN** the bar shows an `Other N` segment and its legend swatch
- **THEN** both use the same neutral grey with at least 3:1 contrast against the surface
