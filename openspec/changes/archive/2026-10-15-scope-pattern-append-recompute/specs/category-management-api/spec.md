# Spec Delta

## ADDED Requirements

### Requirement: An append re-evaluates only the transactions the appended pattern can affect

A `POST /api/categories/:id/patterns` SHALL re-evaluate only the stored transactions the appended
pattern can affect: those whose purpose line or counterparty name matches the appended literal
pattern. Each such transaction SHALL be assigned by the category assignment rule as part of the
append's single operation. Every transaction that does not match the appended pattern SHALL keep the
category it held.

#### Scenario: Matching transactions are re-evaluated

- **WHEN** an append adds a pattern to a category and stored transactions match that pattern
- **THEN** each matching transaction holds the category the category assignment rule selects with the new pattern stored

#### Scenario: A non-matching transaction keeps its category

- **WHEN** an append adds a pattern that matches no part of a stored transaction's purpose line or counterparty name
- **THEN** that transaction's category is unchanged

#### Scenario: The outcome equals a full re-evaluation

- **WHEN** an append has been applied
- **THEN** every stored transaction holds the category the category assignment rule selects against the stored categories as they now stand

#### Scenario: The re-evaluation is atomic with the append

- **WHEN** the re-evaluation of the matching transactions fails
- **THEN** no pattern is stored and no transaction's category changed
