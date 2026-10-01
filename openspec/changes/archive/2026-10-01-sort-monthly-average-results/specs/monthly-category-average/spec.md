# Spec Delta

## MODIFIED Requirements

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
