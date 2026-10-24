# Category Spending Chart Specification

## Purpose

Defines the browser analytics page that presents a separate category spending pie chart for each of the last 12 calendar months, without changing stored data.

## Requirements

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

### Requirement: Monthly chart headings and pie slices link to matching transactions

Each monthly chart heading SHALL be a link to the transaction list with that month selected, all
categories selected, and the page's selected person selected. Each pie slice SHALL be an interactive
link to the transaction list with that slice's month, category, and the page's selected person
selected. A named category link SHALL identify the category by its returned identity; the
uncategorised slice SHALL link to the uncategorised filter. When all people are selected, the link
SHALL carry no person value. The month SHALL be the same calendar month represented by the panel,
based on booking date. Opening either link SHALL show the transaction list with its filters
initialized from the link, without changing stored data or making the chart require another
transaction data source.

#### Scenario: A month heading opens all transactions from that month

- **WHEN** the user activates a monthly chart heading
- **THEN** the transaction list opens with that month, all categories, and the selected person selected

#### Scenario: A named category slice opens matching monthly transactions

- **WHEN** the user activates a named category slice in a month's chart
- **THEN** the transaction list opens filtered to that month, the slice's category, and the selected person

#### Scenario: An uncategorised slice opens matching monthly transactions

- **WHEN** the user activates an uncategorised slice in a month's chart
- **THEN** the transaction list opens filtered to that month, uncategorised transactions, and the selected person

#### Scenario: All people omits the person value

- **WHEN** the page has all people selected and a month or slice link is followed
- **THEN** the transaction list opens with no person filter, showing every person's matching transactions

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

Each year chart heading SHALL be a link to the transaction list with that calendar year selected, all
categories selected, and the page's selected person selected. When all people are selected, the link
SHALL carry no person value. The year SHALL be the calendar year represented by the panel, based on
booking date. Opening the link SHALL show the transaction list with its filters initialized from the
link, without changing stored data or making the chart require another transaction data source.

#### Scenario: A year heading opens all transactions from that year

- **WHEN** the user activates a year chart heading
- **THEN** the transaction list opens with that year, all categories, and the selected person selected

#### Scenario: Year heading navigation remains read-only

- **WHEN** the user follows a year heading link
- **THEN** navigation only reads the existing transaction data and does not create, alter, or delete stored data

### Requirement: Year pie slices link to matching transactions

Each pie slice SHALL be an interactive link to the transaction list with that slice's calendar year,
category, and the page's selected person selected. A named category link SHALL identify the category
by its returned identity; the uncategorised slice SHALL link to the uncategorised filter. When all
people are selected, the link SHALL carry no person value. Opening the link SHALL show the
transaction list with its filters initialized from the link, without changing stored data or making
the chart require another transaction data source.

#### Scenario: A named category slice opens matching yearly transactions

- **WHEN** the user activates a named category slice in a year's chart
- **THEN** the transaction list opens filtered to that year, the slice's category, and the selected person

#### Scenario: An uncategorised slice opens matching yearly transactions

- **WHEN** the user activates an uncategorised slice in a year's chart
- **THEN** the transaction list opens filtered to that year, uncategorised transactions, and the selected person

#### Scenario: All people omits the person value

- **WHEN** the page has all people selected and a year slice link is followed
- **THEN** the transaction list opens with no person filter, showing every person's matching transactions

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

### Requirement: The analytics page offers a page-wide expense-type filter

The analytics page SHALL offer a page-wide control that selects which expense types are shown:
`All`, `Recurring`, or `One-time`. The control SHALL default to `All` and SHALL apply to the months
view and the years view alike. Changing the selection SHALL recompute the panels from the
already-fetched transactions without another data request, and SHALL NOT change stored data. With
`All` selected the page SHALL present exactly what it presents without the control.

#### Scenario: All is the default

- **WHEN** the analytics page loads
- **THEN** the expense-type control reads `All`

#### Scenario: All preserves the existing presentation

- **WHEN** `All` is selected
- **THEN** the same categories, slices, and visible totals are presented as without the control

#### Scenario: The filter applies to both views

- **WHEN** the view is switched between months and years
- **THEN** the selected expense type stays in effect for the presented panels

#### Scenario: Selecting does not re-fetch

- **WHEN** the selection changes
- **THEN** every panel is recomputed from the already-fetched transactions and no additional data request is made

### Requirement: The expense-type filter selects which transactions contribute

With `Recurring` or `One-time` selected, only transactions whose category's expense type equals
the selection SHALL contribute to any panel, slice, or visible total. A transaction whose category
carries no expense type, and an uncategorised transaction, SHALL contribute only while `All` is
selected. A hidden-category transaction SHALL contribute under no selection.

#### Scenario: Only the selected type contributes

- **WHEN** `Recurring` is selected and a transaction's category is one-time
- **THEN** the transaction contributes to no panel, slice, or visible total

#### Scenario: An unset category contributes only under All

- **WHEN** a category carrying no expense type has monthly totals and `One-time` is selected
- **THEN** its transactions contribute to no panel, slice, or visible total, and under `All` they contribute as before

#### Scenario: Uncategorised contributes only under All

- **WHEN** `Recurring` is selected and a transaction has no category
- **THEN** it contributes to no `Uncategorised` slice or visible total

#### Scenario: A hidden category stays excluded

- **WHEN** a hidden category's expense type matches the selected choice
- **THEN** its transactions still contribute to no panel, slice, or visible total

#### Scenario: A filtered month without data is explained

- **WHEN** the selection leaves a month with no eligible transaction
- **THEN** that month's panel shows no chart data and invents no slice or total

### Requirement: The analytics page offers a page-wide person filter

The analytics page SHALL offer a page-wide person filter selecting `All people` or one person
represented in the returned transactions. It SHALL default to `All people`, apply to both views, and
be independent of the expense-type and hide-uncategorised controls. Changing it SHALL recompute every
panel from the already-fetched transactions without another request. The selection SHALL be carried
in the route query as `person=<id>`; an absent or unknown person SHALL mean all people.

#### Scenario: All people is the default

- **WHEN** the analytics page loads without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes every panel

- **WHEN** a person is selected
- **THEN** only the returned transactions that reference that person contribute to any panel, slice, or visible total

#### Scenario: The filter applies to both views

- **WHEN** the view is switched between months and years
- **THEN** the selected person stays in effect for the presented panels

#### Scenario: The filter is independent of expense type

- **WHEN** the expense type is changed
- **THEN** the selected person stays in effect, and changing the person leaves the expense type unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the person selection changes
- **THEN** every panel is recomputed from the already-fetched transactions and no additional data request is made

#### Scenario: The selection is linkable

- **WHEN** the analytics route is opened with `person=<id>` naming a represented person
- **THEN** the person control selects that person and the panels show only that person's transactions

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** the person control selects all people

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers all people and each person represented in the returned transactions, and it makes no request other than the existing transaction read

#### Scenario: A person with no data in a panel is explained

- **WHEN** the selected person has no eligible transaction in a month or year
- **THEN** that panel remains present and explains that there is no category data, without inventing a slice or total

#### Scenario: Hiding uncategorised applies within the person

- **WHEN** a person is selected and `Uncategorised` is hidden
- **THEN** only that person's uncategorised amounts are omitted, and other people's transactions do not reappear
