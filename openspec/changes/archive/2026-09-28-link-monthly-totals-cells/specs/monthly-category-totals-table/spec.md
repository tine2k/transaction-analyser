# Spec Delta

## ADDED Requirements

### Requirement: Populated monthly totals cells link to their transactions

The system SHALL render each monthly totals cell that displays an amount as a link to the transactions screen at `/`. The link SHALL carry the cell's calendar month as `month=YYYY-MM` and the cell's category as a `category` query value: the category identity for a named category column, or `uncategorised` for the `Uncategorised` column. The query values SHALL match the transaction screen's existing filter query contract, so opening the link initializes that screen's month and category filters to the cell's month and category and shows only the matching transactions. A cell whose exact sum is zero SHALL continue to display no amount and SHALL NOT be a link. The system SHALL NOT change the cell's displayed total, the table's month or category order, the single read request, or any stored data.

#### Scenario: A populated named-category cell links to its month and category

- **WHEN** a cell for category identity `1` and month `2026-09` displays a nonzero amount
- **THEN** the cell is a link to the transactions screen for month `2026-09` and category `1`

#### Scenario: The uncategorised cell links with the uncategorised value

- **WHEN** an `Uncategorised` column cell displays a nonzero amount
- **THEN** the cell is a link to the transactions screen for the cell's month with the uncategorised category value

#### Scenario: Opening a cell link initializes both filters

- **WHEN** a populated cell's link is opened
- **THEN** the transactions screen shows its month filter set to the cell's month and its category filter set to the cell's category, and lists only the transactions matching both

#### Scenario: A blank cell is not a link

- **WHEN** a category-month cell has an exact sum of zero and displays no amount
- **THEN** the cell is not a link and offers no interactive affordance

#### Scenario: Linked cells have a hover affordance

- **WHEN** the pointer is over a linked monthly totals cell
- **THEN** the cell presents a hover affordance that marks it as interactive, and blank cells present no such affordance

#### Scenario: Links add no data access or stored-data change

- **WHEN** the monthly totals page renders its links or a link is activated
- **THEN** the page still makes only its one existing transaction read request, and no stored data or category is created, altered, or deleted
