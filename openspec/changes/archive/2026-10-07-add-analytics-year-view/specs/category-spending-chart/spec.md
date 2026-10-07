# Spec Delta

## MODIFIED Requirements

### Requirement: The analytics route presents twelve monthly category pie charts

The system SHALL provide an analytics page at `/analytics` and SHALL request the same-origin `GET /api/transactions` endpoint once when the route is loaded. The page SHALL use the returned transactions as its only transaction data source. In the months view it SHALL present exactly twelve month-labelled chart panels, ordered newest to oldest: the current calendar month and the eleven preceding calendar months. For each month, the page SHALL include transactions whose booking date falls within that calendar month, through today for the current month. Each panel SHALL contain one pie chart whose slices group only that month's transactions by category and sum the absolute value of their amounts; incoming and outgoing amounts SHALL both contribute positively. A transaction whose category is hidden SHALL NOT contribute to any panel, slice, or visible category total, and a hidden category SHALL NOT appear as a slice or a visible total in any of the twelve months. Transactions without a category SHALL contribute to a distinct `Uncategorised` slice by default. Each month's visible category totals and pie slices SHALL be ordered from the greatest exact absolute total to the least; categories with equal totals SHALL be ordered by category name ascending. Every pie slice SHALL have a visible label that identifies its category and displays its exact absolute euro total. All displayed euro totals, including category totals, slice labels, and tooltips, SHALL use the browser's active locale's number and currency conventions, including locale-appropriate thousands grouping, without rounding the exact total. A page-wide control SHALL allow the user to hide or show the `Uncategorised` category; when hidden, uncategorised totals SHALL be omitted from every chart and its visible category totals, without changing stored data. The control SHALL show `Uncategorised` by default. Transactions SHALL NOT be combined across months.

#### Scenario: Exactly twelve monthly charts are presented

- **WHEN** the analytics route is shown on 2026-09-28 with the months view selected
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

## ADDED Requirements

### Requirement: The analytics page switches between months and years views

The analytics page SHALL offer a control that switches between a months view and a years view, and SHALL present the months view by default. The control SHALL be available once transactions have loaded, SHALL change which chart panels are presented without making another data request, and SHALL NOT change stored data. The page-wide hide-uncategorised control SHALL apply to the panels of the selected view.

#### Scenario: The months view is the default

- **WHEN** the analytics route is shown without the user changing the view
- **THEN** the months view is selected and the page presents the twelve monthly chart panels

#### Scenario: Switching views changes the panels without another request

- **WHEN** the user switches from the months view to the years view and back
- **THEN** the page presents the panels of the selected view and makes no additional transaction request

#### Scenario: Hiding uncategorised applies to the selected view

- **WHEN** the user hides `Uncategorised` while the years view is selected
- **THEN** uncategorised totals are omitted from every year panel, and switching back to the months view still shows them omitted there

### Requirement: The years view presents a panel for every available calendar year

In the years view the page SHALL present exactly one year-labelled chart panel for every calendar year represented by at least one eligible transaction, ordered newest to oldest. It SHALL NOT include a year with no eligible transaction, impose a rolling limit on the years shown, or let a hidden-category transaction represent its year. If no year has an eligible transaction, the years view SHALL present no year panels and explain that there is no category data for any year.

#### Scenario: A panel exists for every year with data

- **WHEN** eligible transactions have booking dates in 2024, 2025, and 2026
- **THEN** the years view presents three year-labelled panels ordered 2026, 2025, 2024

#### Scenario: A hidden category does not represent its year

- **WHEN** every transaction in 2023 has a hidden category and other years have eligible transactions
- **THEN** no 2023 panel is presented

#### Scenario: No available years shows an empty years view

- **WHEN** the request succeeds and no returned transaction is eligible
- **THEN** the years view presents no year panels and states that there is no category data for any year

### Requirement: Year panels sum absolute category totals across the year

Each year panel SHALL contain one pie chart whose slices group that year's eligible transactions by category and sum the absolute value of their amounts; incoming and outgoing amounts SHALL both contribute positively, and transactions SHALL NOT be combined across years. Transactions without a category SHALL contribute to a distinct `Uncategorised` slice by default.

#### Scenario: A year's transactions are summed across its months

- **WHEN** a category has amounts `-12.50` in March 2026 and `4.00` in November 2026
- **THEN** the 2026 panel shows their exact absolute total `16.50`, and no other year panel includes those amounts

#### Scenario: Incoming and outgoing year amounts both contribute positively

- **WHEN** a category has amounts `-12.50` and `4.00` in one year
- **THEN** that year's panel shows their absolute-value sum, `16.50`

### Requirement: Year panels follow the months view presentation

Year panels SHALL follow the months view's visible category total and slice ordering, visible category and amount labels, locale number and currency formatting, and hide-uncategorised behaviour. A year panel whose visible totals are empty SHALL remain present and explain that there is no category data for that year.

#### Scenario: Year totals and slices are sorted by amount

- **WHEN** a year has visible categories with different exact absolute totals
- **THEN** its visible category totals and pie slices appear in descending total order, with equal totals ordered by category name ascending

#### Scenario: Hiding uncategorised empties a year panel

- **WHEN** a year's only visible totals are uncategorised and the user hides `Uncategorised`
- **THEN** the year panel remains present with no slices and states that there is no category data for that year

#### Scenario: Year euro totals use the browser locale and preserve exact values

- **WHEN** a displayed yearly total, slice label, or tooltip contains a large euro amount
- **THEN** it uses the browser's active locale's EUR currency and number formatting, includes locale-appropriate thousands grouping, and does not round the exact total

### Requirement: Year chart headings link to all transactions from that year

Each year chart heading SHALL be a link to the transaction list with that calendar year selected and all categories selected. The year SHALL be the calendar year represented by the panel, based on booking date. Opening the link SHALL show the transaction list with its filters initialized from the link, without changing stored data or making the chart require another transaction data source.

#### Scenario: A year heading opens all transactions from that year

- **WHEN** the user activates a year chart heading
- **THEN** the transaction list opens with that year and all categories selected

#### Scenario: Year heading navigation remains read-only

- **WHEN** the user follows a year heading link
- **THEN** navigation only reads the existing transaction data and does not create, alter, or delete stored data

### Requirement: Year pie slices link to matching transactions

Each pie slice SHALL be an interactive link to the transaction list with that slice's calendar year and category selected. A named category link SHALL identify the category by its returned identity; the uncategorised slice SHALL link to the uncategorised filter. Opening the link SHALL show the transaction list with its filters initialized from the link, without changing stored data or making the chart require another transaction data source.

#### Scenario: A named category slice opens matching yearly transactions

- **WHEN** the user activates a named category slice in a year's chart
- **THEN** the transaction list opens filtered to that year and the slice's category

#### Scenario: An uncategorised slice opens matching yearly transactions

- **WHEN** the user activates an uncategorised slice in a year's chart
- **THEN** the transaction list opens filtered to that year and uncategorised transactions

### Requirement: Category colors are consistent across yearly charts and between views

The system SHALL assign each category a consistent color across all yearly pie charts and across both analytics views, so a category keeps the same color in every yearly chart where it appears and when the view changes. The color shown for a category in a yearly chart SHALL match the color indicator for that category in the same panel's visible totals. `Uncategorised` SHALL retain its color when hidden and shown again.

#### Scenario: A category keeps its color between years

- **WHEN** the same category has totals in two or more yearly charts
- **THEN** its pie slice and visible total indicator use the same color in every such year

#### Scenario: A category keeps its color when the view changes

- **WHEN** the user switches between the months view and the years view
- **THEN** each category keeps the same color in both views

#### Scenario: Hiding uncategorised does not change other colors in the years view

- **WHEN** the user hides or shows `Uncategorised`
- **THEN** every named category retains the same color in the yearly charts before and after the change
