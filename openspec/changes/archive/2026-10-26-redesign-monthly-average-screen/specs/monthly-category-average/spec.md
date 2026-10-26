# Spec Delta

## ADDED Requirements

### Requirement: The monthly average page presents a category comparison table

The page SHALL present each listed category as a row in a semantic comparison table with a caption and column headers, whose columns are the category, the configured window's monthly trend, the average monthly amount and its relative bar, the exact window total, and the exact average per month. The category name SHALL carry a mark from the single category palette. The trend and total column labels and the subtitle SHALL state the applied number of months.

#### Scenario: Every listed category has a comparison row

- **WHEN** the page lists categories for the configured window
- **THEN** each category appears once as a table row with its name, trend, average, window total, and average per month

#### Scenario: The average bar is relative to the largest average

- **WHEN** listed categories have different average monthly amounts
- **THEN** the category with the largest average draws a full bar, every other bar is proportional to it, and a zero average draws no fill

#### Scenario: The window total and average are exact

- **WHEN** a category has included transactions in several window months
- **THEN** its window total is the exact sum of its absolute monthly totals, and its average per month is that total divided by the applied months and rounded to the euro cent

#### Scenario: The labels follow the applied window

- **WHEN** the applied window is 6 months
- **THEN** the trend and total column labels and the subtitle state 6 months, and no label claims 12 months

#### Scenario: The table is semantic

- **WHEN** the comparison table is inspected
- **THEN** it has a caption, column headers, and one row per category, and every displayed amount is present as text

### Requirement: The category comparison table shows a per-month trend

The table SHALL show, for each category, one bar for each month in the configured window in chronological order. Each bar's height SHALL be relative to that category's largest month in the window. A month with no included transaction SHALL show a minimum bar rather than a missing bar. The trend SHALL be a visual summary: the exact window total and average SHALL remain available as text, and the trend SHALL be hidden from assistive technology.

#### Scenario: One bar is shown for every window month

- **WHEN** the applied window is 12 months
- **THEN** each category row shows 12 bars in chronological order, oldest month first

#### Scenario: A month without spend keeps a bar

- **WHEN** a category has no included transaction in one window month
- **THEN** that month's bar is shown at the minimum height and the month is not omitted

#### Scenario: The largest month sets the row scale

- **WHEN** a category's monthly totals differ within the window
- **THEN** its largest month draws the tallest bar in that row, and another category's scale does not affect it

#### Scenario: The window length changes the bar count

- **WHEN** the applied window changes from 12 to 6 months
- **THEN** every category row shows 6 bars for the new window

#### Scenario: Hidden categories do not shape a trend

- **WHEN** a transaction within the window belongs to a hidden category
- **THEN** it contributes to no bar, total, or average, and its category has no row

#### Scenario: The trend is not the only carrier

- **WHEN** the trend is unavailable to assistive technology
- **THEN** the category's exact window total and average per month remain present in the row as text

### Requirement: The monthly average page shows window summary figures

The page SHALL show three summary figures: the average per month for the current person and expense-type selection, the recurring per month for the selected person, and the one-time per month for the selected person. Each figure SHALL be the exact absolute window sum divided by the applied months, rounded to the cent, and SHALL update from the already-fetched transactions without another request. The typed figures SHALL NOT be presented as a partition of the all-types figure.

#### Scenario: The three figures are shown

- **WHEN** the page shows category averages
- **THEN** it shows the current-selection average per month, the recurring per month, and the one-time per month

#### Scenario: The current-selection figure follows the expense type

- **WHEN** the expense-type selection changes from All to Recurring
- **THEN** the current-selection figure reflects only recurring-category transactions

#### Scenario: The typed figures follow the person but not the expense type

- **WHEN** the expense-type selection changes
- **THEN** the recurring and one-time figures stay the same, and changing the person recomputes both

#### Scenario: Typed figures cover typed categories only

- **WHEN** the selected person has uncategorised transactions or transactions in categories carrying no expense type
- **THEN** those transactions contribute to the current-selection figure but to neither typed figure

#### Scenario: Hidden categories contribute to no figure

- **WHEN** a hidden category has transactions within the window
- **THEN** its amounts contribute to none of the three figures

#### Scenario: Changing the window recomputes every figure

- **WHEN** the applied window changes to another positive whole number of months
- **THEN** every summary figure is recomputed over the new window without another data request

#### Scenario: Empty data shows zero figures

- **WHEN** no included transaction falls within the window
- **THEN** the three summary figures show zero and the page states that there is no category data

### Requirement: The comparison table reports its active sort

The table SHALL report the active sort column and direction through the sorted column header's sort state and a visible direction mark. The existing sort-column and sort-direction controls SHALL remain the controls that change the sort.

#### Scenario: The default sort is reported

- **WHEN** the page first shows the table
- **THEN** the average-per-month column reports descending order and carries the descending mark

#### Scenario: A sort change is reported

- **WHEN** the user selects category as the sort column and ascending as the direction
- **THEN** the category column reports ascending order and carries the ascending mark, and no other column reports a sort

#### Scenario: The header is not a second sort control

- **WHEN** the user activates a column header
- **THEN** the sort does not change, because the sort controls remain the only controls that set it
