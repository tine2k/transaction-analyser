# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: A category matches a purpose line as a case-insensitive substring`
- TO: `### Requirement: A category matches the purpose line or the counterparty name as a case-insensitive substring`

## MODIFIED Requirements

### Requirement: A category matches the purpose line or the counterparty name as a case-insensitive substring

Matching SHALL ignore case and SHALL succeed when at least one of the category's regular
expressions matches any part of the transaction's purpose line or any part of its counterparty
name. The system SHALL NOT require the whole purpose line or the whole counterparty name to match.
Matching SHALL NOT alter, reformat, or replace either text, and SHALL NOT require either to
conform to any shape. An expression that matches the empty string SHALL match every transaction. A
category's expressions SHALL be alternatives: the category matches when any one of them matches
either text, and the others need not match for the category to match. Consequently, a category
carrying an expression that matches the empty string SHALL match every transaction.

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

#### Scenario: A match inside the counterparty name is enough

- **WHEN** a category's expression matches a part of a counterparty name but not the whole name
- **THEN** the category matches that transaction

#### Scenario: The purpose line need not match when the counterparty name does

- **WHEN** a category's expression matches no part of a purpose line but matches a part of the counterparty name
- **THEN** the category matches that transaction

#### Scenario: Matching ignores case in the counterparty name

- **WHEN** a category's expression is `rewe` and a counterparty name reads `REWE Markt`
- **THEN** the category matches that transaction

#### Scenario: Matching leaves the counterparty name unchanged

- **WHEN** a category is matched against a counterparty name and assigned
- **THEN** the stored and reported counterparty name is exactly the text it was before the match

### Requirement: Date windows decide assignment only after every regular expression has failed

The system SHALL consider regular expressions before date windows. When at least one category's
regular expression matches a transaction's purpose line or counterparty name, the transaction's
category SHALL be decided among the matching categories by the existing rules and no date window
SHALL be applied, whatever the identities involved. Only when no category's regular expression
matches the purpose line or the counterparty name SHALL the system consider the categories whose
date windows cover the transaction's booking date. A transaction matched by no expression and
covered by no window SHALL be uncategorised. This ordering SHALL hold under re-evaluation, so a
transaction that gains an expression match after a category change SHALL stop being held by a date
window.

#### Scenario: An expression match beats a covering window

- **WHEN** a transaction's purpose line matches a category's expression and its booking date is covered by another category's window
- **THEN** the transaction holds the category whose expression matched, and the window is not applied

#### Scenario: A window decides when no expression matches

- **WHEN** no category's regular expression matches a transaction's purpose line and one category's window covers its booking date
- **THEN** the transaction holds that window's category

#### Scenario: A small-identity window does not beat an expression match

- **WHEN** a transaction's purpose line matches a category's expression and a different category with a smaller identity carries a window that covers the booking date
- **THEN** the transaction holds the category whose expression matched, because identity does not let a window outrank an expression

#### Scenario: No expression and no window leaves the transaction uncategorised

- **WHEN** no category's regular expression matches a transaction's purpose line and no category's window covers its booking date
- **THEN** the transaction reads as uncategorised

#### Scenario: A later expression match displaces a window assignment

- **WHEN** a transaction was held by a date window and, after a category change, a regular expression matches its purpose line
- **THEN** re-evaluation replaces the window's category with the expression-winning category

#### Scenario: A counterparty-name match beats a covering window

- **WHEN** a transaction's counterparty name matches a category's expression and its booking date is covered by another category's window
- **THEN** the transaction holds the category whose expression matched, and the window is not applied

### Requirement: Among matching categories the smallest identity wins

When more than one category's expression matches a single transaction's purpose line or
counterparty name, the system SHALL assign the matching category whose storage identity is
smallest. The winning category SHALL be the same on every evaluation of the same stored data, so
the outcome does not depend on the order in which categories are read.

#### Scenario: The smallest identity wins an overlap

- **WHEN** two categories both match one purpose line and one has a smaller identity
- **THEN** the transaction holds the category with the smaller identity

#### Scenario: The outcome is stable

- **WHEN** the same overlapping categories and purpose line are evaluated again
- **THEN** the same category wins

#### Scenario: The smallest identity wins when both match the counterparty name

- **WHEN** two categories' expressions both match one counterparty name and one has a smaller identity
- **THEN** the transaction holds the category with the smaller identity
