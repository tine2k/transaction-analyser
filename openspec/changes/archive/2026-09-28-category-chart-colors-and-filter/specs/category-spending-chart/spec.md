# Spec Delta

## MODIFIED Requirements

### Requirement: The analytics route presents twelve monthly category pie charts

The system SHALL provide an analytics page at `/analytics` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. The page SHALL use the returned transactions as its only transaction data source. It SHALL present exactly twelve month-labelled chart panels, ordered newest to oldest: the current calendar month and the eleven preceding calendar months. For each month, the page SHALL include transactions whose booking date falls within that calendar month, through today for the current month. Each panel SHALL contain one pie chart whose slices group only that month's transactions by category and sum the absolute value of their amounts; incoming and outgoing amounts SHALL both contribute positively. Transactions without a category SHALL contribute to a distinct `Uncategorised` slice by default. Each chart's visible legend SHALL identify its visible categories and show their exact absolute totals as euro amounts. Transactions SHALL NOT be combined across months. A page-wide control SHALL allow the user to hide or show the `Uncategorised` category; when hidden, uncategorised totals SHALL be omitted from every chart and its visible category totals, without changing stored data. The control SHALL show `Uncategorised` by default.

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

#### Scenario: Uncategorised transactions have a monthly slice by default

- **WHEN** a transaction in a month has no category and the hide control is not selected
- **THEN** its absolute amount contributes to that month's distinct `Uncategorised` slice and visible category total

#### Scenario: Hiding uncategorised removes it from every chart

- **WHEN** the user selects the control to hide `Uncategorised`
- **THEN** uncategorised amounts are omitted from the pie slices and visible category totals in all twelve panels, while named category totals remain unchanged

#### Scenario: Showing uncategorised restores its monthly totals

- **WHEN** the user clears the control to hide `Uncategorised`
- **THEN** each month's `Uncategorised` slice and total are shown again where that month has uncategorised transactions

#### Scenario: Each chart's legend shows that month's visible euro totals

- **WHEN** a month has visible category totals
- **THEN** that month's visible legend identifies each category and shows its exact absolute total as a euro amount

## ADDED Requirements

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
