# Spec Delta

## ADDED Requirements

### Requirement: The monthly totals table offers a page-wide expense-type filter

The monthly totals page SHALL offer a page-wide control that selects which expense types are
shown: `All`, `Recurring`, or `One-time`. The control SHALL default to `All`. Changing the
selection SHALL rebuild the table from the already-fetched transactions without another data
request, and SHALL NOT change stored data. With `All` selected the table SHALL present exactly what
it presents without the control.

#### Scenario: All is the default

- **WHEN** the monthly totals page loads
- **THEN** the expense-type control reads `All`

#### Scenario: All preserves the existing table

- **WHEN** `All` is selected
- **THEN** the same month rows, category columns, and cell totals are presented as without the control

#### Scenario: Selecting does not re-fetch

- **WHEN** the selection changes
- **THEN** the table is rebuilt from the already-fetched transactions and no additional data request is made

### Requirement: The expense-type filter selects which transactions contribute to the table

With `Recurring` or `One-time` selected, only transactions whose category's expense type equals
the selection SHALL contribute to any cell or category column. A transaction whose category
carries no expense type, and an uncategorised transaction, SHALL contribute only while `All` is
selected. A hidden-category transaction SHALL contribute under no selection.

#### Scenario: Only the selected type contributes

- **WHEN** `Recurring` is selected and a transaction's category is one-time
- **THEN** the transaction contributes to no cell and its category appears as no column

#### Scenario: An unset category contributes only under All

- **WHEN** a category carrying no expense type has cell totals and `One-time` is selected
- **THEN** its transactions contribute to no cell, its category appears as no column, and a month represented only by them appears as no row; under `All` they contribute as before

#### Scenario: Uncategorised contributes only under All

- **WHEN** `Recurring` is selected and a transaction has no category
- **THEN** no `Uncategorised` column appears for it and no cell includes its amount

#### Scenario: A hidden category stays excluded

- **WHEN** a hidden category's expense type matches the selected choice
- **THEN** its transactions still contribute to no cell and its category appears as no column

#### Scenario: A filtered table without data is explained

- **WHEN** the selection leaves no eligible transaction
- **THEN** the table shows no month rows or category columns and explains that there is no category data
