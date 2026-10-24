# Spec Delta

## ADDED Requirements

### Requirement: A refresh after an assignment re-presents only the rows it changed

When the refresh that follows an assignment arrives, the system SHALL re-present only the rows whose displayed category or assignment marker changed, and SHALL leave every other presented row in place without replacing it, reordering it, or moving the table's scroll position.

#### Scenario: Only the assigned rows are re-presented

- **WHEN** the refresh shows that one transaction's category changed, while every other transaction's category and assignment marker are unchanged
- **THEN** that row is re-presented and no other row is replaced

#### Scenario: A refresh that changes nothing re-presents no row

- **WHEN** the refresh matches every displayed row's category and assignment marker
- **THEN** no row is replaced

#### Scenario: Order and scroll position survive the refresh

- **WHEN** the refresh arrives while the table is scrolled away from its first row
- **THEN** the table's scroll position and the row order are unchanged

#### Scenario: A row whose assignment became manual is re-presented

- **WHEN** the refresh shows the same category as displayed for a transaction whose assignment is now manual
- **THEN** that row is re-presented and carries the manual-assignment marker
