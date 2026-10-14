# Spec Delta

## ADDED Requirements

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
