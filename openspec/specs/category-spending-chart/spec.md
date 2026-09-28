# Category Spending Chart Specification

## Purpose

Defines the browser analytics page that presents a separate category spending pie chart for each of the last 12 calendar months, without changing stored data.

## Requirements

### Requirement: The analytics route presents twelve monthly category pie charts

The system SHALL provide an analytics page at `/analytics` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. The page SHALL use the returned transactions as its only transaction data source. It SHALL present exactly twelve month-labelled chart panels, ordered newest to oldest: the current calendar month and the eleven preceding calendar months. For each month, the page SHALL include transactions whose booking date falls within that calendar month, through today for the current month. Each panel SHALL contain one pie chart whose slices group only that month's transactions by category and sum the absolute value of their amounts; incoming and outgoing amounts SHALL both contribute positively. Transactions without a category SHALL contribute to a distinct `Uncategorised` slice for their month. Each chart's visible legend SHALL identify its categories and show their exact absolute totals as euro amounts. Transactions SHALL NOT be combined across months.

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

#### Scenario: Uncategorised transactions have a monthly slice

- **WHEN** a transaction in a month has no category
- **THEN** its absolute amount contributes to that month's distinct `Uncategorised` slice

#### Scenario: Each chart's legend shows that month's euro totals

- **WHEN** a month has category totals
- **THEN** that month's visible legend identifies each category and shows its exact absolute total as a euro amount

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
