# Spec Delta

## MODIFIED Requirements

### Requirement: A category matches a purpose line as a case-insensitive substring

Matching SHALL ignore case and SHALL succeed when at least one of the category's regular
expressions matches any part of the purpose line. The system SHALL NOT require the whole purpose
line to match. Matching SHALL NOT alter, reformat, or replace the purpose line, and SHALL NOT
require the purpose line to conform to any shape. An expression that matches the empty string
SHALL match every transaction. A category's expressions SHALL be alternatives: the category
matches when any one of them matches, and the others need not match for the category to match.
Consequently, a category carrying an expression that matches the empty string SHALL match every
transaction.

#### Scenario: A match inside the line is enough

- **WHEN** a category's expression matches a part of a purpose line but not the whole line
- **THEN** the category matches that transaction

#### Scenario: Matching ignores case

- **WHEN** a category's expression is `rewe` and a purpose line reads `REWE Markt`
- **THEN** the category matches that transaction

#### Scenario: The whole line need not match

- **WHEN** a purpose line reads `Card payment REWE 1234` and a category's expression is `rewe`
- **THEN** the category matches, because matching is not anchored to the whole line

#### Scenario: Any one of a category's expressions is enough

- **WHEN** a category holds several expressions and only one of them matches the purpose line
- **THEN** the category matches that transaction, because its expressions are alternatives

#### Scenario: Matching leaves the purpose line unchanged

- **WHEN** a category is matched against a purpose line and assigned
- **THEN** the stored and reported purpose line is exactly the text it was before the match
