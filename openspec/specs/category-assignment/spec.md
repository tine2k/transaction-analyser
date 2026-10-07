# Category Assignment Specification

## Purpose

Defines when a transaction's category is derived by matching category expressions against its
purpose line, how a purpose line is matched, how overlaps are resolved, and how transactions are
reconciled when the category set changes. It settles the matching decisions the
`transaction-domain-model` capability previously left open.

## Requirements

### Requirement: A category change re-evaluates every stored transaction

When the set of stored categories changes, by a create, an edit, or a delete, the system SHALL re-evaluate every stored transaction and set its category to the category that wins the matching among the categories as they now stand, or leave it uncategorised when no category matches. The evaluation SHALL be part of the same operation that changed the categories, so no transaction is left categorised by an expression that no longer matches it.

#### Scenario: Creating a category assigns it to matching transactions

- **WHEN** a category is created whose expression matches the purpose line of a previously uncategorised transaction
- **THEN** that transaction holds the new category once the create has succeeded

#### Scenario: Editing a category re-evaluates every transaction

- **WHEN** a category's expression is changed so that it matches purpose lines it did not match before, and stops matching others
- **THEN** transactions are reassigned to or away from it to agree with the new expression

#### Scenario: A deleted category is not left on any transaction

- **WHEN** a category is deleted
- **THEN** no transaction holds it afterwards

### Requirement: An import assigns categories to the rows it writes

When an import writes transactions, the system SHALL evaluate each newly written transaction against the stored categories: a regular expression match is considered before a date window, and among matching categories the smallest identity wins. The transaction SHALL hold the winning category, or read as uncategorised when nothing matches. The evaluation SHALL cover only the rows the import wrote and SHALL be part of the write's single unit.

#### Scenario: A new transaction matching an expression is categorised as it is imported

- **WHEN** an import writes a transaction whose purpose line matches a stored category's expression
- **THEN** the written transaction holds that category once the import has succeeded

#### Scenario: A new transaction covered by a window is categorised as it is imported

- **WHEN** an import writes a transaction that no stored expression matches but a stored category's date window covers by its booking date
- **THEN** the written transaction holds that window's category

#### Scenario: A new transaction that matches nothing is uncategorised

- **WHEN** an import writes a transaction that no stored expression matches and no stored window covers
- **THEN** the written transaction reads as uncategorised, and stays so until the next change to the category set

#### Scenario: The import does not re-evaluate a transaction it did not write

- **WHEN** the table already holds an uncategorised transaction from an earlier import and a later import writes other rows that match a stored category
- **THEN** only the later import's rows are categorised, and the earlier transaction still reads as uncategorised

#### Scenario: A failure leaves no assignment

- **WHEN** an import fails while writing or evaluating its rows
- **THEN** no transaction of that import exists and no stored transaction's category was changed

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

### Requirement: A transaction holds at most one category and re-evaluation replaces it

Re-evaluation SHALL set the transaction's single category and SHALL NOT add a second. A
transaction that matched one category and then matches a different one SHALL hold only the new
one. A transaction that matches no category SHALL be uncategorised, and uncategorised SHALL NOT
be represented as a category.

#### Scenario: Re-evaluation replaces rather than accumulates

- **WHEN** a transaction held category A and, after a change, matches category B instead
- **THEN** the transaction holds only B

#### Scenario: A transaction that matches nothing becomes uncategorised

- **WHEN** a transaction's purpose line is matched by no category after an evaluation
- **THEN** its category reads as absent, and no catch-all category is invented for it

### Requirement: A category's date window covers a transaction by its booking date

A category MAY carry zero or more date windows. A window SHALL hold a `from` date and a `to`
date, each at day precision with no time of day, and SHALL be inclusive of both endpoints. A
transaction SHALL fall in a window exactly when its booking date is on or after the window's
`from` and on or before its `to`. The value date SHALL NOT be consulted to decide a window, and
neither a window's endpoint nor its result SHALL alter, reformat, or derive any field of the
transaction.

#### Scenario: A booking date on the from day is inside the window

- **WHEN** a category carries the window 2026-07-01 to 2026-07-14 and a transaction's booking date is 2026-07-01
- **THEN** the transaction falls in the window

#### Scenario: A booking date on the to day is inside the window

- **WHEN** a category carries the window 2026-07-01 to 2026-07-14 and a transaction's booking date is 2026-07-14
- **THEN** the transaction falls in the window, because both endpoints are inclusive

#### Scenario: A booking date before the window is outside

- **WHEN** a category carries the window 2026-07-01 to 2026-07-14 and a transaction's booking date is 2026-06-30
- **THEN** the transaction does not fall in the window

#### Scenario: A booking date after the window is outside

- **WHEN** a category carries the window 2026-07-01 to 2026-07-14 and a transaction's booking date is 2026-07-15
- **THEN** the transaction does not fall in the window

#### Scenario: The value date does not decide a window

- **WHEN** a category carries the window 2026-07-01 to 2026-07-14, a transaction's booking date is 2026-06-30, and its value date is 2026-07-05
- **THEN** the transaction does not fall in the window, because the booking date alone is tested

#### Scenario: A covered transaction is otherwise unchanged

- **WHEN** a transaction falls in a category's window and is assigned that category
- **THEN** its purpose line, booking date, value date, amount, counterparty name, and counterparty account are exactly the values they were before

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

### Requirement: Among covering windows the smallest identity wins

When a transaction's booking date is nevertheless covered by more than one category's date window,
the system SHALL assign the covering category whose storage identity is smallest. The winning
category SHALL be the same on every evaluation of the same stored data, so the outcome does not
depend on the order in which categories are read.

#### Scenario: The smallest identity wins when windows overlap

- **WHEN** two categories' date windows both cover a transaction's booking date and no expression matches, and one category has a smaller identity
- **THEN** the transaction holds the category with the smaller identity

#### Scenario: The outcome is stable

- **WHEN** the same overlapping windows and booking date are evaluated again
- **THEN** the same category wins
