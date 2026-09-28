# Category Spending Chart Specification

## Purpose

Defines the browser analytics page that presents a separate category spending pie chart for each of the last 12 calendar months, without changing stored data.

## Requirements

### Requirement: The analytics route presents twelve monthly category pie charts

The system SHALL provide an analytics page at `/analytics` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. The page SHALL use the returned transactions as its only transaction data source. It SHALL present exactly twelve month-labelled chart panels, ordered newest to oldest: the current calendar month and the eleven preceding calendar months. For each month, the page SHALL include transactions whose booking date falls within that calendar month, through today for the current month. Each panel SHALL contain one pie chart whose slices group only that month's transactions by category and sum the absolute value of their amounts; incoming and outgoing amounts SHALL both contribute positively. A transaction whose category is hidden SHALL NOT contribute to any panel, slice, or visible category total, and a hidden category SHALL NOT appear as a slice or a visible total in any of the twelve months. Transactions without a category SHALL contribute to a distinct `Uncategorised` slice by default. Each month's visible category totals and pie slices SHALL be ordered from the greatest exact absolute total to the least; categories with equal totals SHALL be ordered by category name ascending. Every pie slice SHALL have a visible label that identifies its category and displays its exact absolute euro total. All displayed euro totals, including category totals, slice labels, and tooltips, SHALL use the browser's active locale's number and currency conventions, including locale-appropriate thousands grouping, without rounding the exact total. A page-wide control SHALL allow the user to hide or show the `Uncategorised` category; when hidden, uncategorised totals SHALL be omitted from every chart and its visible category totals, without changing stored data. The control SHALL show `Uncategorised` by default. Transactions SHALL NOT be combined across months.

#### Scenario: Exactly twelve monthly charts are presented

- **WHEN** the analytics route is shown on 2026-09-28
- **THEN** it presents twelve chart panels, one for each month from October 2025 through September 2026, ordered September 2026 first and October 2025 last

#### Scenario: Booking dates fall into their calendar-month chart

- **WHEN** a transaction has a booking date in one of the twelve months
- **THEN** it contributes only to that month's chart, and a booking date before October 2025 or after today contributes to none of the charts

#### Scenario: Category totals are separate for each month

- **WHEN** the same category has in-period transactions in two different months
- **THEN** each month's chart shows only the absolute total from that month, without combining the two months' amounts

#### Scenario: Incoming and outgoing amounts both contribute positively

- **WHEN** a category has amounts `-12.50` and `4.00` in one month
- **THEN** that month's chart shows their absolute-value sum, `16.50`

#### Scenario: A hidden category is excluded from every chart

- **WHEN** a transaction falls in one of the twelve months and its category is hidden
- **THEN** it contributes to no slice and no visible category total in any of the twelve panels, and its hidden category is absent from every panel

#### Scenario: Hiding a category leaves other totals unchanged

- **WHEN** a hidden category has monthly totals and other categories have totals in the same months
- **THEN** the other categories' slices and visible totals are unchanged, and only the hidden category's amounts are omitted

#### Scenario: Uncategorised transactions have a monthly slice by default

- **WHEN** a transaction in a month has no category and the hide control is not selected
- **THEN** its absolute amount contributes to that month's distinct `Uncategorised` slice and visible category total

#### Scenario: Hiding uncategorised removes it from every chart

- **WHEN** the user selects the control to hide `Uncategorised`
- **THEN** uncategorised amounts are omitted from the pie slices and visible category totals in all twelve panels, while named category totals remain unchanged

#### Scenario: Showing uncategorised restores its monthly totals

- **WHEN** the user clears the control to hide `Uncategorised`
- **THEN** each month's `Uncategorised` slice and total are shown again where that month has uncategorised transactions

#### Scenario: Category totals and slices are sorted by amount

- **WHEN** a month has visible categories with different exact absolute totals
- **THEN** its visible category totals and pie slices appear in descending total order, with equal totals ordered by category name ascending

#### Scenario: Euro totals use the browser locale and preserve exact values

- **WHEN** a displayed monthly total, slice label, or tooltip contains a large euro amount
- **THEN** it uses the browser's active locale's EUR currency and number formatting, includes locale-appropriate thousands grouping, and does not round the exact total

#### Scenario: Every pie slice has a visible category and amount label

- **WHEN** a monthly chart contains one or more pie slices
- **THEN** every slice visibly displays its category name and its formatted exact euro total without requiring hover or selection

#### Scenario: Each month's visible category totals show that month's euro amounts

- **WHEN** a month has visible category totals
- **THEN** the visible totals identify each category and show its exact absolute total as a locale-formatted euro amount

### Requirement: Monthly chart headings and pie slices link to matching transactions

Each monthly chart heading SHALL be a link to the transaction list with that month selected and all categories selected. Each pie slice SHALL be an interactive link to the transaction list with that slice's month and category selected. A named category link SHALL identify the category by its returned identity; the uncategorised slice SHALL link to the uncategorised filter. The month SHALL be the same calendar month represented by the panel, based on booking date. Opening either link SHALL show the transaction list with its filters initialized from the link, without changing stored data or making the chart require another transaction data source.

#### Scenario: A month heading opens all transactions from that month

- **WHEN** the user activates a monthly chart heading
- **THEN** the transaction list opens with that month and all categories selected

#### Scenario: A named category slice opens matching monthly transactions

- **WHEN** the user activates a named category slice in a month's chart
- **THEN** the transaction list opens filtered to that month and the slice's category

#### Scenario: An uncategorised slice opens matching monthly transactions

- **WHEN** the user activates an uncategorised slice in a month's chart
- **THEN** the transaction list opens filtered to that month and uncategorised transactions

#### Scenario: Chart navigation remains read-only

- **WHEN** the user follows a month or slice link
- **THEN** navigation only reads the existing transaction data and does not create, alter, or delete stored data

### Requirement: Category colors are consistent across monthly charts

The system SHALL assign each category a consistent color across all twelve monthly pie charts, independent of category ordering, the month in which it appears, or whether `Uncategorised` is hidden. The color shown for a category in a chart SHALL match the color indicator for that category in the month's visible totals. `Uncategorised` SHALL also retain its color when hidden and shown again.

#### Scenario: A category keeps its color between months

- **WHEN** the same category has totals in two or more monthly charts
- **THEN** its pie slice and visible total indicator use the same color in every such month

#### Scenario: Category colors do not shift with category order

- **WHEN** categories occur in a different order or in different combinations across months
- **THEN** each category retains the same color in each chart where it appears

#### Scenario: Hiding uncategorised does not change other colors

- **WHEN** the user hides or shows `Uncategorised`
- **THEN** every named category retains the same color before and after the change

### Requirement: Every month remains represented when it has no chart data

The system SHALL keep all twelve month-labelled chart panels when a month has no eligible transactions. That month's chart SHALL contain no invented slices, and the panel SHALL explain that there is no category data for that month. If all twelve months have no eligible category totals, the page SHALL show the empty state for each month rather than a fabricated chart.

#### Scenario: An empty month keeps its chart panel

- **WHEN** a month has no eligible transactions
- **THEN** its month-labelled panel remains present, its chart has no slices, and the panel states that there is no category data for that month

#### Scenario: All twelve months are empty

- **WHEN** the request succeeds but no transaction falls in any of the twelve months
- **THEN** all twelve month panels remain present with empty states and no invented slices

### Requirement: The analytics page distinguishes loading and failed results

The system SHALL show a loading state while transactions are being requested. If the request fails, the page SHALL state that monthly category totals could not be loaded and SHALL NOT present the failure as empty months or display stale totals.

#### Scenario: Transaction loading fails

- **WHEN** the request for transactions fails
- **THEN** the page reports that monthly category totals could not be loaded and does not represent the result as twelve empty months

### Requirement: The chart page is read-only and does not invent categories

The analytics page SHALL only read transactions through `GET /api/transactions`. It SHALL NOT create, alter, or delete transactions or categories, evaluate category matching expressions, or show transaction or category data that was not returned by the endpoint. The page SHALL NOT issue another data request to populate the charts.

#### Scenario: Chart interaction does not change stored data

- **WHEN** the analytics page is used
- **THEN** it makes no request that creates, alters, or deletes transaction or category data

#### Scenario: Chart categories come from returned transactions

- **WHEN** a monthly chart displays category totals
- **THEN** every named category shown comes from a transaction returned for that month, and no category is invented

#### Scenario: The existing transaction endpoint is the only data request

- **WHEN** the analytics page loads its monthly chart data
- **THEN** its transaction data comes from the single same-origin `GET /api/transactions` request
