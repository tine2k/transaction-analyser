# Spec Delta

## MODIFIED Requirements

### Requirement: The monthly average page presents a category comparison table

The page SHALL present each listed category as a card below the `sm` breakpoint and as a row in a semantic comparison table from `sm` up. Each presentation SHALL show the category, the configured window's monthly trend, the average monthly amount and its relative bar, the exact window total, and the exact average per month. The category name SHALL carry a mark from the single category palette. The trend and total labels and the subtitle SHALL state the applied number of months. In the card presentation the window total and average per month SHALL be labelled as text, the trend and average bar SHALL be hidden from assistive technology, and no exact value SHALL be available only through horizontal scrolling.

#### Scenario: Every listed category has a comparison row

- **WHEN** the page lists categories for the configured window
- **THEN** each category appears once, as a card below the `sm` breakpoint and as a table row from `sm` up, with its name, trend, average, window total, and average per month

#### Scenario: A phone shows one card per category

- **WHEN** the comparison is shown below the `sm` breakpoint
- **THEN** each category card shows its name and palette mark, its monthly trend bars, its relative average bar, a labelled exact window total, and a labelled exact average per month

#### Scenario: The average bar is relative to the largest average

- **WHEN** listed categories have different average monthly amounts
- **THEN** the category with the largest average draws a full bar, every other bar is proportional to it, and a zero average draws no fill

#### Scenario: The window total and average are exact

- **WHEN** a category has included transactions in several window months
- **THEN** its window total is the exact sum of its absolute monthly totals, and its average per month is that total divided by the applied months and rounded to the euro cent

#### Scenario: The labels follow the applied window

- **WHEN** the applied window is 6 months
- **THEN** the trend and total labels, the card labels, and the subtitle state 6 months, and no label claims 12 months

#### Scenario: The table is semantic

- **WHEN** the comparison table is inspected from the `sm` breakpoint up
- **THEN** it has a caption, column headers, and one row per category, and every displayed amount is present as text

#### Scenario: The card presentation keeps the exact values as text

- **WHEN** a category card is inspected below the `sm` breakpoint
- **THEN** its window total and average per month are present as text, and the hidden trend and bar are not the only carrier of either value

### Requirement: The comparison table reports its active sort

From the `sm` breakpoint up the table SHALL report the active sort column and direction through the sorted column header's sort state and a visible direction mark. Below `sm` the card list SHALL state the active sort column and direction as text beside the sort controls. The existing sort-column and sort-direction controls SHALL remain the controls that change the sort at every width.

#### Scenario: The default sort is reported

- **WHEN** the page first shows the comparison from the `sm` breakpoint up
- **THEN** the average-per-month column reports descending order and carries the descending mark

#### Scenario: A sort change is reported

- **WHEN** the user selects category as the sort column and ascending as the direction
- **THEN** the category column reports ascending order and carries the ascending mark, and no other column reports a sort

#### Scenario: The header is not a second sort control

- **WHEN** the user activates a column header
- **THEN** the sort does not change, because the sort controls remain the only controls that set it

#### Scenario: The phone card list states the active sort

- **WHEN** the comparison is shown below the `sm` breakpoint
- **THEN** a visible statement beside the sort controls names the active sort column and direction and updates when either changes

#### Scenario: The phone controls still change the sort

- **WHEN** the user changes the sort column or direction below the `sm` breakpoint
- **THEN** the cards reorder to match, and the visible sort statement names the new column and direction
