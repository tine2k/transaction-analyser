# Spec Delta

## ADDED Requirements

### Requirement: The monthly average page offers a page-wide expense-type filter

The monthly average page SHALL offer a page-wide control that selects which expense types are
shown: `All`, `Recurring`, or `One-time`. The control SHALL default to `All` and SHALL be
independent of the month-count window. Changing the selection SHALL recompute every average from
the already-fetched transactions without another data request, and SHALL NOT change stored data.
With `All` selected the page SHALL present exactly what it presents without the control.

#### Scenario: All is the default

- **WHEN** the monthly average page loads
- **THEN** the expense-type control reads `All`

#### Scenario: All preserves the existing list

- **WHEN** `All` is selected
- **THEN** the same category entries with the same averages are presented as without the control

#### Scenario: The filter and the window are independent

- **WHEN** the month-count window changes
- **THEN** the selected expense type stays in effect, and changing the expense type leaves the window unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the selection changes
- **THEN** every average is recomputed from the already-fetched transactions and no additional data request is made

### Requirement: The expense-type filter selects which transactions contribute to the averages

With `Recurring` or `One-time` selected, only transactions whose category's expense type equals
the selection SHALL contribute to any category's sum or average, and only such categories SHALL be
listed. A transaction whose category carries no expense type, and an uncategorised transaction,
SHALL contribute only while `All` is selected. A hidden-category transaction SHALL contribute
under no selection.

#### Scenario: Only the selected type is listed

- **WHEN** `Recurring` is selected and a category's expense type is one-time
- **THEN** the category is not listed and its transactions contribute to no sum or average

#### Scenario: An unset category is listed only under All

- **WHEN** a category carrying no expense type has window transactions and `One-time` is selected
- **THEN** the category is not listed, and under `All` it is listed with its usual average

#### Scenario: Uncategorised is listed only under All

- **WHEN** `Recurring` is selected and a transaction has no category
- **THEN** no `Uncategorised` entry is listed and uncategorised amounts contribute to no average

#### Scenario: A hidden category stays excluded

- **WHEN** a hidden category's expense type matches the selected choice
- **THEN** it is not listed and its transactions contribute to no sum or average

#### Scenario: A filtered list without data is explained

- **WHEN** the selection leaves no eligible transaction within the window
- **THEN** the page shows no category entries and states that there is no category data
