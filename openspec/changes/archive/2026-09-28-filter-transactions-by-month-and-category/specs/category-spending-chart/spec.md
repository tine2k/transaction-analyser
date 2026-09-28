# Spec Delta

## ADDED Requirements

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
