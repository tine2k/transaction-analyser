# Spec Delta

## REMOVED Requirements

### Requirement: The Yearly matrix presents categories as rows and months as columns

**Reason**: Future month columns are no longer shown, so the matrix no longer always has twelve month columns.

**Migration**: Use the added requirement "The Yearly matrix presents categories as rows and elapsed months as columns". Past years keep twelve columns; the current year ends at the current month.

### Requirement: Yearly month and total cells hold exact absolute sums

**Reason**: The not-yet-elapsed month marker no longer exists, and a row total now includes amounts from hidden future months as well as shown month cells.

**Migration**: Use the added requirements "Shown Yearly month cells hold exact absolute sums" and "Yearly totals cover the whole year including hidden months". Absolute sums, sign handling, zero display, and locale formatting are carried forward.

### Requirement: Summary cards count the selected year

**Reason**: A future year can no longer be selected, so the future-year average rule is replaced by the hidden-future-month rule.

**Migration**: Use the added requirement "Summary cards count the selected year and its hidden months". The total, elapsed-month divisor, filters, and cent rounding are carried forward.

### Requirement: The Yearly matrix tints populated cells by row-relative magnitude

**Reason**: The matrix no longer renders a cell for a not-yet-elapsed month, so the tint rule is stated in terms of shown cells only.

**Migration**: Use the added requirement "The Yearly matrix tints populated shown cells by row-relative magnitude". Row-relative tinting, ink-coloured amounts, and the untinted total column are carried forward.

## ADDED Requirements

### Requirement: The Yearly matrix presents categories as rows and elapsed months as columns

The page SHALL present a table with one row for each category represented by an included transaction in the selected year and one column for each elapsed calendar month of the selected year plus a `Total` column. A future month SHALL have no column. Named categories SHALL appear once, and a distinct `Uncategorised` row SHALL appear when an included transaction has no category.

#### Scenario: Categories are rows and elapsed months are columns

- **WHEN** returned transactions in the selected year have named categories
- **THEN** the table identifies each represented category in a row header and each elapsed month plus `Total` in column headers

#### Scenario: A hidden future month still contributes its row

- **WHEN** an included transaction has a category and falls in a future month of the selected current year
- **THEN** the category appears as a row, no cell is shown for that month, and the row's `Total` includes the transaction

#### Scenario: Uncategorised is a separate row

- **WHEN** an included transaction in the selected year has no category
- **THEN** the table includes one `Uncategorised` row and invents no other category

### Requirement: The Yearly matrix covers the elapsed months of the year

For the current calendar year the month columns SHALL cover January through the calendar month containing today; for a past calendar year they SHALL cover January through December.

#### Scenario: The current year stops at the current month

- **WHEN** the page presents the current calendar year and the current month is October
- **THEN** the table shows January through October and no November or December column

#### Scenario: A past year keeps twelve month columns

- **WHEN** the page presents a calendar year before the current year
- **THEN** twelve month columns are shown, including months with no included transaction

### Requirement: Shown Yearly month cells hold exact absolute sums

Each shown month cell SHALL be the exact sum of the absolute amounts of included transactions for its category and shown month. Incoming and outgoing amounts SHALL both contribute positively. A shown month cell whose exact sum is zero SHALL display no amount. Nonzero amounts SHALL use the browser's active locale's EUR conventions without rounding.

#### Scenario: Both signs contribute positively

- **WHEN** a category has amounts `-12.50` and `4.00` in one month
- **THEN** that month's cell shows the exact absolute sum `16.50`

#### Scenario: Zero amounts display nothing

- **WHEN** a shown category-month cell has an exact sum of zero
- **THEN** the cell remains in its row and column position but displays no amount

#### Scenario: Nonzero amounts preserve exact locale EUR values

- **WHEN** a cell contains a nonzero large or fractional total
- **THEN** it displays the exact amount using the browser's active locale's EUR conventions and thousands grouping without rounding

### Requirement: Yearly totals cover the whole year including hidden months

Each `Total` cell SHALL be the exact sum of that row's absolute amounts across the entire selected year, including amounts dated in hidden future months. A zero total SHALL display no amount. A category represented only by a transaction in a hidden future month SHALL remain a row because its total includes that transaction.

#### Scenario: The total is the row's year sum

- **WHEN** a category has shown month cells `16.50` and `7.00` and a transaction of `-10.00` in a hidden future month
- **THEN** its `Total` cell shows the exact value `33.50`

#### Scenario: A hidden future month has no cell and still counts

- **WHEN** a category has a transaction in a future month of the selected current year
- **THEN** no month cell is rendered for that transaction and its absolute amount contributes to the row's `Total`

### Requirement: Summary cards count the selected year and its hidden months

The page SHALL present two summary cards: `Total moved {year}`, the exact sum of absolute included amounts for the selected year including amounts dated in hidden future months, and `Avg per month`, that total divided by elapsed calendar months in the year. The current year uses the current month number and a past year uses twelve. Both follow the person, expense-type, and hide-uncategorised selections. The average rounds to the euro cent, halves away from zero.

#### Scenario: Total moved sums absolute amounts

- **WHEN** the selected year has amounts `-12.50` and `4.00`
- **THEN** `Total moved` shows the exact value `16.50`

#### Scenario: Average divides by elapsed months

- **WHEN** the selected year is the current year, the current month is October, and the year total is `38019`
- **THEN** `Avg per month` shows the exact value of `38019 ÷ 10`, rounded to the euro cent

#### Scenario: A past year divides by twelve

- **WHEN** the selected year is before the current year
- **THEN** `Avg per month` divides the year total by twelve

#### Scenario: A hidden future month still counts in the cards

- **WHEN** the selected current year has a transaction in a hidden future month
- **THEN** `Total moved` includes its absolute amount and `Avg per month` divides that total by the elapsed months

#### Scenario: The cards follow the filters

- **WHEN** the person, expense type, or hide-uncategorised selection changes
- **THEN** both cards recompute from the already-fetched transactions without another request

#### Scenario: An empty current year shows zero and a zero average

- **WHEN** the selected current year has no included transaction
- **THEN** `Total moved` shows zero and `Avg per month` shows zero for the elapsed months

### Requirement: The Yearly matrix tints populated shown cells by row-relative magnitude

The Yearly matrix SHALL tint each populated shown month cell's background by the cell's amount relative to the largest amount among that row's shown month cells: the row's largest shown month SHALL be the darkest cell, and a row whose largest shown amount is zero SHALL have no tint. The exact amount SHALL remain in ink in every cell. A zero shown month cell SHALL use a neutral background, and a hidden future month SHALL have no cell and no tint. The `Total` column SHALL NOT be tinted.

#### Scenario: The row's largest shown month is darkest

- **WHEN** a category's March amount is greater than its other shown month amounts
- **THEN** March has the darkest tint in that row and every other populated shown month is lighter

#### Scenario: A zero row has no tint

- **WHEN** every shown month amount in a category row is zero
- **THEN** the row's shown month cells have no magnitude tint

#### Scenario: Amounts remain ink

- **WHEN** a populated cell is tinted
- **THEN** its amount text remains in the theme's ink color and the exact value remains readable

#### Scenario: Zero shown cells are neutral

- **WHEN** a shown month cell is an elapsed zero
- **THEN** its background is neutral rather than a magnitude tint

#### Scenario: A hidden future month does not set the row scale

- **WHEN** a category has a transaction in a future month that has no column
- **THEN** no cell is rendered for that month and the row's shown-cell tints are based only on the shown months

#### Scenario: The total column is untinted

- **WHEN** the table renders a category's `Total` cell
- **THEN** the cell has no magnitude tint

## MODIFIED Requirements

### Requirement: Year pills select the displayed year

The page SHALL offer year pills for every calendar year represented by an included transaction up to the current calendar year, and the current calendar year. It SHALL NOT offer a future year. Pills SHALL be ordered oldest to newest. The selected year SHALL be carried in the route query as `year=YYYY`. A supplied well-formed year at or before the current year SHALL be selected even when no transaction represents it. A supplied future year SHALL be treated as unavailable and SHALL NOT be selected or offered. An absent, malformed, or future year SHALL select the current year when it is represented, otherwise the newest represented year at or before the current year, otherwise the current year. Selecting a year SHALL NOT make another data request.

#### Scenario: The year pills offer represented years, the current year, and a queried year

- **WHEN** returned transactions represent 2024 and 2025, the current year is 2026, and the query names 2023
- **THEN** the pills offer 2023, 2024, 2025, and 2026 in that order

#### Scenario: The current year is the default when represented

- **WHEN** the route carries no year and an included transaction falls in the current calendar year
- **THEN** the current year is selected

#### Scenario: The newest represented year is the fallback

- **WHEN** the route carries no year, no included transaction falls in the current calendar year, and an included transaction falls in a future year
- **THEN** the newest calendar year at or before the current year represented by an included transaction is selected

#### Scenario: A year link initializes the page

- **WHEN** `/yearly` is opened with `year=2025`
- **THEN** 2025 is selected and its matrix and cards are shown

#### Scenario: A future year is not offered and its link falls back

- **WHEN** an included transaction falls in a future year
- **THEN** that year is not offered by the pills, and `/yearly` opened with that `year` value selects its normal current-or-newest year instead

#### Scenario: Selecting a year does not re-fetch

- **WHEN** the user selects another year pill
- **THEN** the page recomputes from the already-fetched transactions and makes no additional data request
