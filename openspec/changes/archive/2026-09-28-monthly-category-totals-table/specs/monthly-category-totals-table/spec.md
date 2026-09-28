# Spec Delta

## Purpose

Provides a read-only comparison of absolute transaction totals across categories and recent months. The table makes the category-by-month sums visible together in a single view.

## ADDED Requirements

### Requirement: The monthly totals route presents a category-by-month table

The system SHALL provide a menu-accessible page at `/monthly-totals` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. It SHALL use the returned transactions as its only transaction data source. The page SHALL present a table with category column headings and one month row for every distinct calendar month represented by at least one returned transaction, across the returned history, ordered newest to oldest. It SHALL NOT impose a rolling 12-month limit or include months with no returned transactions. The category columns SHALL include each category represented by a returned transaction and a distinct `Uncategorised` column when a returned transaction has no category. Named category columns SHALL be ordered by category name ascending, case-insensitively, with category identity ascending as a tie-breaker; `Uncategorised` SHALL follow named categories. Each cell SHALL represent the exact sum of the absolute amounts of transactions for its month and category, with incoming and outgoing amounts both contributing positively. A cell whose exact sum is zero SHALL remain in the table to preserve row and column alignment but SHALL display no amount. Nonzero amounts SHALL use the browser's active locale's EUR currency and number conventions without rounding the exact value. The table SHALL NOT combine transactions across months or change stored data.

#### Scenario: Categories are columns and represented months are rows

- **WHEN** returned transactions have booking dates in several calendar months
- **THEN** its table identifies categories in column headers and each represented calendar month in a row header, with all such months ordered newest to oldest

#### Scenario: Cell totals use booking month and absolute amounts

- **WHEN** a category has transactions `-12.50` and `4.00` in one month and a transaction of `-7.00` in the next month
- **THEN** the first month's cell shows the exact absolute sum `16.50`, and the next month's cell shows `7.00`

#### Scenario: Categories come from eligible returned transactions

- **WHEN** returned transactions have named categories and uncategorised transactions
- **THEN** the table includes columns for the represented named categories and one separate `Uncategorised` column, and does not invent other categories

#### Scenario: Category columns have stable alphabetical order

- **WHEN** returned category names differ in case or have equal names
- **THEN** named category columns are ordered case-insensitively by name, with equal names ordered by category identity, followed by `Uncategorised` when present

#### Scenario: Zero-total cells remain blank and aligned

- **WHEN** a category-month cell has an exact sum of zero, either because no transaction intersects it or because its transactions have zero amounts
- **THEN** the table retains the cell in its row and column position but displays no amount in it

#### Scenario: Empty data has no month or category rows

- **WHEN** the request succeeds but returns no transactions
- **THEN** the table shows no month rows or category columns and explains that there is no category data

#### Scenario: Loading and request failure are distinct from empty data

- **WHEN** the transaction request is pending or fails
- **THEN** the page shows an appropriate loading or failure state and does not present the result as an empty table or display stale totals

#### Scenario: Nonzero displayed totals preserve exact locale-formatted euro values

- **WHEN** a cell contains a nonzero large or fractional total
- **THEN** it displays the exact amount using the browser's active locale's EUR conventions and appropriate thousands grouping without rounding

#### Scenario: The table uses only the existing read endpoint

- **WHEN** the monthly totals page loads or is used
- **THEN** it makes one same-origin transaction read request, makes no additional data request, and creates, alters, or deletes no stored data
