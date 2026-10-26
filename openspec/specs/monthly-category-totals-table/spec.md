# Yearly Category Table Specification

## Purpose

Provides a read-only comparison of absolute transaction totals across categories and months for one selected calendar year, with year pills, summary figures, and a total column.

## Requirements

### Requirement: The Yearly route presents a selected year from one transaction read

The system SHALL provide a menu-accessible page at `/yearly` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. It SHALL use the returned transactions as its only transaction data source. It SHALL exclude every transaction whose category is hidden from every row, cell, total, and summary figure. It SHALL NOT create, alter, or delete stored data.

#### Scenario: The route loads its data once

- **WHEN** the `/yearly` route is shown
- **THEN** it makes one same-origin `GET /api/transactions` request and derives the page from that response

#### Scenario: A hidden category contributes to nothing

- **WHEN** a returned transaction has a hidden category
- **THEN** its category appears as no row, its amount contributes to no cell or total, and it contributes to no summary figure

#### Scenario: The page is read-only

- **WHEN** the Yearly page loads or its controls are used
- **THEN** no transaction, category, person, or import run is created, altered, or deleted

### Requirement: The Yearly matrix presents categories as rows and months as columns

The page SHALL present a table with one row for each category represented by an included transaction in the selected year and one column for each calendar month January through December plus a `Total` column. Named categories SHALL appear once. A distinct `Uncategorised` row SHALL appear when an included transaction has no category. The twelve month columns SHALL always be present for the selected year.

#### Scenario: Categories are rows and months are columns

- **WHEN** returned transactions in the selected year have named categories
- **THEN** the table identifies each represented category in a row header and January through December plus `Total` in column headers

#### Scenario: Twelve month columns are always present

- **WHEN** the page presents a selected year
- **THEN** twelve month columns are shown, including months with no included transaction

#### Scenario: Uncategorised is a separate row

- **WHEN** an included transaction in the selected year has no category
- **THEN** the table includes one `Uncategorised` row and invents no other category

### Requirement: Yearly month and total cells hold exact absolute sums

Each month cell SHALL be the exact sum of the absolute amounts of included transactions for its category and month. Each `Total` cell SHALL be the exact sum of that row's month amounts. Incoming and outgoing amounts SHALL both contribute positively. A month cell whose exact sum is zero SHALL display no amount; a zero total SHALL display no amount. Nonzero amounts SHALL use the browser's active locale's EUR conventions without rounding.

#### Scenario: Both signs contribute positively

- **WHEN** a category has amounts `-12.50` and `4.00` in one month
- **THEN** that month's cell shows the exact absolute sum `16.50`

#### Scenario: The total is the row's year sum

- **WHEN** a category has month cells `16.50`, `7.00`, and `0`
- **THEN** its `Total` cell shows the exact value `23.50`

#### Scenario: Zero amounts display nothing

- **WHEN** a category-month cell has an exact sum of zero
- **THEN** the cell remains in its row and column position but displays no amount, and a zero total also displays no amount

#### Scenario: Nonzero amounts preserve exact locale EUR values

- **WHEN** a cell contains a nonzero large or fractional total
- **THEN** it displays the exact amount using the browser's active locale's EUR conventions and thousands grouping without rounding

#### Scenario: A not-yet-elapsed month is marked

- **WHEN** the selected year is the current year and a month after the current month has no included transaction
- **THEN** that month cell displays `–` rather than an amount

### Requirement: Yearly rows are ordered by year total

Rows SHALL be ordered by `Total` descending, then by category name ascending ignoring case, then by category identity ascending. `Uncategorised` SHALL participate in that order rather than being forced last. A category with a zero total SHALL remain a row.

#### Scenario: Rows are ordered by total descending

- **WHEN** represented categories have different year totals
- **THEN** they appear from the greatest total to the least

#### Scenario: Equal totals use name and identity

- **WHEN** two categories have the same year total
- **THEN** they are ordered by name ignoring case, then by category identity ascending

#### Scenario: Uncategorised participates in the order

- **WHEN** the `Uncategorised` row has a year total greater than a named category
- **THEN** it appears above that category rather than at the end

### Requirement: Year pills select the displayed year

The page SHALL offer year pills for every calendar year represented by an included transaction, the current calendar year, and any well-formed `year` query value. Pills SHALL be ordered oldest to newest. The selected year SHALL be carried in the route query as `year=YYYY`. An absent or malformed year SHALL select the current year when it is represented, otherwise the newest represented year, otherwise the current year. Selecting a year SHALL NOT make another data request.

#### Scenario: The year pills offer represented years, the current year, and a queried year

- **WHEN** returned transactions represent 2024 and 2025, the current year is 2026, and the query names 2023
- **THEN** the pills offer 2023, 2024, 2025, and 2026 in that order

#### Scenario: The current year is the default when represented

- **WHEN** the route carries no year and an included transaction falls in the current calendar year
- **THEN** the current year is selected

#### Scenario: The newest represented year is the fallback

- **WHEN** the route carries no year and no included transaction falls in the current calendar year
- **THEN** the newest calendar year represented by an included transaction is selected

#### Scenario: A year link initializes the page

- **WHEN** `/yearly` is opened with `year=2025`
- **THEN** 2025 is selected and its matrix and cards are shown

#### Scenario: Selecting a year does not re-fetch

- **WHEN** the user selects another year pill
- **THEN** the page recomputes from the already-fetched transactions and makes no additional data request

### Requirement: Summary cards count the selected year

The page SHALL present two summary cards: `Total moved {year}`, the exact sum of absolute included amounts for the selected year, and `Avg per month`, that total divided by elapsed calendar months in the year. The current year uses the current month number, a past year uses twelve, and a future year shows no average. Both follow the person, expense-type, and hide-uncategorised selections. The average rounds to the euro cent, halves away from zero.

#### Scenario: Total moved sums absolute amounts

- **WHEN** the selected year has amounts `-12.50` and `4.00`
- **THEN** `Total moved` shows the exact value `16.50`

#### Scenario: Average divides by elapsed months

- **WHEN** the selected year is the current year, the current month is October, and the year total is `38019`
- **THEN** `Avg per month` shows the exact value of `38019 ÷ 10`, rounded to the euro cent

#### Scenario: A past year divides by twelve

- **WHEN** the selected year is before the current year
- **THEN** `Avg per month` divides the year total by twelve

#### Scenario: A future year shows no average

- **WHEN** the selected year is after the current year
- **THEN** `Avg per month` shows no average rather than a fabricated figure

#### Scenario: The cards follow the filters

- **WHEN** the person, expense type, or hide-uncategorised selection changes
- **THEN** both cards recompute from the already-fetched transactions without another request

#### Scenario: An empty current year shows zero and a zero average

- **WHEN** the selected current year has no included transaction
- **THEN** `Total moved` shows zero and `Avg per month` shows zero for the elapsed months

### Requirement: The Yearly matrix tints populated cells by row-relative magnitude

The Yearly matrix SHALL tint each populated month cell's background by the cell's amount relative to the largest month amount in its row: the row's largest month SHALL be the darkest cell, and a row whose largest amount is zero SHALL have no tint. The exact amount SHALL remain in ink in every cell. A not-yet-elapsed month with no included transaction and a zero month cell SHALL use a neutral background. The `Total` column SHALL NOT be tinted.

#### Scenario: The row's largest month is darkest

- **WHEN** a category's March amount is greater than its other month amounts
- **THEN** March has the darkest tint in that row and every other populated month is lighter

#### Scenario: A zero row has no tint

- **WHEN** every month amount in a category row is zero
- **THEN** the row's month cells have no magnitude tint

#### Scenario: Amounts remain ink

- **WHEN** a populated cell is tinted
- **THEN** its amount text remains in the theme's ink color and the exact value remains readable

#### Scenario: Not-yet-elapsed and zero cells are neutral

- **WHEN** a month cell is not yet elapsed with no data, or is an elapsed zero
- **THEN** its background is neutral rather than a magnitude tint

#### Scenario: The total column is untinted

- **WHEN** the table renders a category's `Total` cell
- **THEN** the cell has no magnitude tint

### Requirement: Populated Yearly cells link to their transactions

Each populated month cell SHALL link to the transactions screen at `/` with `month=YYYY-MM`, the cell's category as `category` — the category identity or `uncategorised` — and the selected person as `person=<id>` when one is selected. Each populated `Total` cell SHALL link with `year=YYYY`, the category, and the selected person. A populated month cell's link SHALL fill the cell so the whole cell is its interactive and hover area. A blank cell SHALL NOT be a link. Links SHALL add no data request and change no stored data.

#### Scenario: A populated month cell links to its month and category

- **WHEN** a cell for category identity `1` and month `2026-09` displays an amount
- **THEN** it is a link to the transactions screen for month `2026-09` and category `1`

#### Scenario: A populated total cell links to its year and category

- **WHEN** a `Total` cell for category identity `1` and year `2026` displays an amount
- **THEN** it is a link to the transactions screen for year `2026` and category `1`

#### Scenario: Uncategorised links with the uncategorised value

- **WHEN** an `Uncategorised` cell displays an amount
- **THEN** its link carries `category=uncategorised`

#### Scenario: A selected person is carried

- **WHEN** a person is selected and a populated cell is opened
- **THEN** the link carries that person as `person=<id>`

#### Scenario: A blank cell is not a link

- **WHEN** a month or total cell displays no amount
- **THEN** the cell is not a link and offers no interactive affordance

#### Scenario: Linked cells have a hover affordance

- **WHEN** the pointer is over a linked cell
- **THEN** the cell presents a hover affordance that marks it as interactive

#### Scenario: A populated month cell's hover covers the whole cell

- **WHEN** the pointer is over any part of a populated month cell, including the area above or below its amount within the row
- **THEN** the entire cell presents the hover affordance and activates the month link

#### Scenario: Links add no data access

- **WHEN** the page renders its links or a link is activated
- **THEN** the page makes no additional data request and changes no stored data

### Requirement: The Yearly page offers a page-wide expense-type filter

The page SHALL offer a page-wide control selecting `All`, `Recurring`, or `One-time` expense types, defaulting to `All`. Changing it SHALL rebuild the matrix and cards from the already-fetched transactions without another request. With `Recurring` or `One-time`, only transactions whose category carries that expense type SHALL contribute; a category with no expense type and an uncategorised transaction SHALL contribute only under `All`. A hidden category SHALL contribute under no selection.

#### Scenario: All is the default

- **WHEN** the Yearly page loads
- **THEN** the expense-type control reads `All`

#### Scenario: All preserves the matrix

- **WHEN** `All` is selected
- **THEN** the same rows, month cells, totals, and cards are presented as without the control

#### Scenario: Selecting does not re-fetch

- **WHEN** the expense-type selection changes
- **THEN** the matrix and cards rebuild from the already-fetched transactions and no additional data request is made

#### Scenario: Only the selected type contributes

- **WHEN** `Recurring` is selected and a category's expense type is one-time
- **THEN** the category appears as no row and its transactions contribute to no cell, total, or card

#### Scenario: An unset category contributes only under All

- **WHEN** a category carrying no expense type has year transactions and `One-time` is selected
- **THEN** the category appears as no row and contributes to no figure; under `All` it contributes as before

#### Scenario: Uncategorised contributes only under All

- **WHEN** `Recurring` is selected and a transaction has no category
- **THEN** no `Uncategorised` row appears for it and no figure includes its amount

#### Scenario: A hidden category stays excluded

- **WHEN** a hidden category's expense type matches the selected choice
- **THEN** it still appears as no row and contributes to no figure

#### Scenario: A filtered matrix without data is explained

- **WHEN** the selection leaves no eligible transaction in the selected year
- **THEN** the page shows no category rows and explains that there is no category data

### Requirement: The Yearly page offers a page-wide person filter

The page SHALL offer a page-wide person filter selecting `All people` or one person represented in the returned transactions, defaulting to `All people`. The selection SHALL be carried as `person=<id>`; an absent or unknown person SHALL mean all people. Changing it SHALL rebuild the matrix and cards from the already-fetched transactions without another request. It SHALL be independent of the year, expense-type, and hide-uncategorised controls.

#### Scenario: All people is the default

- **WHEN** the page loads without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes the matrix

- **WHEN** a person is selected
- **THEN** only returned transactions referencing that person contribute to any row, cell, total, or card

#### Scenario: The filter is independent of the other controls

- **WHEN** the year, expense type, or hide-uncategorised selection changes
- **THEN** the selected person stays in effect, and changing the person leaves those selections unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the person selection changes
- **THEN** the matrix and cards rebuild from the already-fetched transactions and no additional data request is made

#### Scenario: The selection is linkable

- **WHEN** `/yearly` is opened with `person=<id>` naming a represented person
- **THEN** the person control selects that person and the page shows only that person's transactions

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** the person control selects all people

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers all people and each person represented in the returned transactions, and it makes no request other than the existing transaction read

#### Scenario: A person with no data is explained

- **WHEN** the selected person has no eligible transaction in the selected year
- **THEN** the page shows no category rows and explains that there is no category data

### Requirement: The Yearly page offers a hide-uncategorised control

The page SHALL offer a hide-uncategorised control, off by default. When on, uncategorised transactions SHALL be excluded from every row, cell, total, summary card, and average; when off they SHALL contribute as usual. The control SHALL rebuild from the already-fetched transactions, make no additional request, and change no stored data.

#### Scenario: Uncategorised is included by default

- **WHEN** the page loads with uncategorised transactions in the selected year
- **THEN** the `Uncategorised` row is shown and its amounts contribute to the figures

#### Scenario: Hiding removes it everywhere

- **WHEN** hide-uncategorised is on
- **THEN** the `Uncategorised` row disappears and its amounts contribute to no cell, total, or card

#### Scenario: Clearing the control restores it

- **WHEN** hide-uncategorised is turned off again
- **THEN** the `Uncategorised` row and its contributions return

#### Scenario: The control does not re-fetch or change stored data

- **WHEN** hide-uncategorised changes
- **THEN** the page recomputes from the already-fetched transactions, makes no additional request, and changes no stored data

### Requirement: The Yearly page distinguishes loading, failure, and empty data

Loading, request failure, and an empty selected year SHALL be distinct states. While pending, the page SHALL show a loading state. On failure, it SHALL show a failure state. On success with no included transaction in the selected year, it SHALL show a zero `Total moved`, the applicable average, no category rows, and an explanation. It SHALL NOT show stale figures or invent rows.

#### Scenario: Loading is distinct from empty

- **WHEN** the transaction request is pending
- **THEN** the page shows a loading state and does not present an empty matrix

#### Scenario: Failure is distinct from empty

- **WHEN** the transaction request fails
- **THEN** the page shows a failure state and does not present stale or fabricated figures

#### Scenario: An empty year shows zero figures and no rows

- **WHEN** the request succeeds but no included transaction falls in the selected year
- **THEN** `Total moved` shows zero, `Avg per month` follows the elapsed-month rule, the table shows no category rows, and the page explains that there is no category data

#### Scenario: A filtered empty year is explained

- **WHEN** the active filters leave no eligible transaction in the selected year
- **THEN** the page shows no category rows and explains that there is no category data

### Requirement: The Yearly page uses only the existing read endpoint

The page SHALL make one same-origin transaction read request on load and SHALL make no additional data request when the year, person, expense type, or hide-uncategorised selection changes. It SHALL NOT create, alter, or delete any stored data.

#### Scenario: The page makes one read request

- **WHEN** `/yearly` is loaded
- **THEN** it makes one same-origin `GET /api/transactions` request

#### Scenario: Selection changes add no request

- **WHEN** the year, person, expense type, or hide-uncategorised selection changes
- **THEN** no additional data request is made

#### Scenario: The page changes no stored data

- **WHEN** the page is loaded or used
- **THEN** no stored transaction, category, person, or import run is created, altered, or deleted
