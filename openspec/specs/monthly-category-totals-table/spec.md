# Monthly Category Totals Table Specification

## Purpose

Provides a read-only comparison of absolute transaction totals across categories and recent months. The table makes the category-by-month sums visible together in a single view.

## Requirements

### Requirement: The monthly totals route presents a category-by-month table

The system SHALL provide a menu-accessible page at `/monthly-totals` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. It SHALL use the returned transactions as its only transaction data source. The page SHALL exclude every returned transaction whose category is hidden before it derives the represented months, category columns, and cell sums: a hidden-category transaction SHALL NOT contribute to any cell, SHALL NOT cause a month to be represented, and SHALL NOT cause its category to appear as a column. The page SHALL present a table with category column headings and one month row for every distinct calendar month represented by at least one included transaction, across the included history, ordered newest to oldest. It SHALL NOT impose a rolling 12-month limit or include months with no included transactions. The category columns SHALL include each category represented by an included transaction and a distinct `Uncategorised` column when an included transaction has no category. Named category columns SHALL be ordered by category name ascending, case-insensitively, with category identity ascending as a tie-breaker; `Uncategorised` SHALL follow named categories. Each cell SHALL represent the exact sum of the absolute amounts of included transactions for its month and category, with incoming and outgoing amounts both contributing positively. A cell whose exact sum is zero SHALL remain in the table to preserve row and column alignment but SHALL display no amount. Nonzero amounts SHALL use the browser's active locale's EUR currency and number conventions without rounding the exact value. The table SHALL NOT combine transactions across months or change stored data.

#### Scenario: Categories are columns and represented months are rows

- **WHEN** returned transactions have booking dates in several calendar months
- **THEN** its table identifies categories in column headers and each represented calendar month in a row header, with all such months ordered newest to oldest

#### Scenario: Cell totals use booking month and absolute amounts

- **WHEN** a category has transactions `-12.50` and `4.00` in one month and a transaction of `-7.00` in the next month
- **THEN** the first month's cell shows the exact absolute sum `16.50`, and the next month's cell shows `7.00`

#### Scenario: Categories come from eligible returned transactions

- **WHEN** returned transactions have named categories and uncategorised transactions
- **THEN** the table includes columns for the represented named categories and one separate `Uncategorised` column, and does not invent other categories

#### Scenario: A hidden category is excluded from the table

- **WHEN** a returned transaction's category is hidden
- **THEN** the transaction contributes to no cell, its category appears as no column, and a month represented only by such transactions appears as no row

#### Scenario: Hiding a category leaves other cells unchanged

- **WHEN** a hidden category and a visible category both have transactions in a month
- **THEN** the visible category's cell shows the same exact total it would without the hidden category, and only the hidden category's amounts are omitted

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

### Requirement: Populated monthly totals cells link to their transactions

The system SHALL render each monthly totals cell that displays an amount as a link to the transactions screen at `/`. The link SHALL carry the cell's calendar month as `month=YYYY-MM` and the cell's category as a `category` query value: the category identity for a named category column, or `uncategorised` for the `Uncategorised` column. The query values SHALL match the transaction screen's existing filter query contract, so opening the link initializes that screen's month and category filters to the cell's month and category and shows only the matching transactions. A cell whose exact sum is zero SHALL continue to display no amount and SHALL NOT be a link. The system SHALL NOT change the cell's displayed total, the table's month or category order, the single read request, or any stored data.

#### Scenario: A populated named-category cell links to its month and category

- **WHEN** a cell for category identity `1` and month `2026-09` displays a nonzero amount
- **THEN** the cell is a link to the transactions screen for month `2026-09` and category `1`

#### Scenario: The uncategorised cell links with the uncategorised value

- **WHEN** an `Uncategorised` column cell displays a nonzero amount
- **THEN** the cell is a link to the transactions screen for the cell's month with the uncategorised category value

#### Scenario: Opening a cell link initializes both filters

- **WHEN** a populated cell's link is opened
- **THEN** the transactions screen shows its month filter set to the cell's month and its category filter set to the cell's category, and lists only the transactions matching both

#### Scenario: A blank cell is not a link

- **WHEN** a category-month cell has an exact sum of zero and displays no amount
- **THEN** the cell is not a link and offers no interactive affordance

#### Scenario: Linked cells have a hover affordance

- **WHEN** the pointer is over a linked monthly totals cell
- **THEN** the cell presents a hover affordance that marks it as interactive, and blank cells present no such affordance

#### Scenario: Links add no data access or stored-data change

- **WHEN** the monthly totals page renders its links or a link is activated
- **THEN** the page still makes only its one existing transaction read request, and no stored data or category is created, altered, or deleted
