# Spec Delta

## ADDED Requirements

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
regular expression matches a transaction's purpose line, the transaction's category SHALL be
decided among the matching categories by the existing rules and no date window SHALL be applied,
whatever the identities involved. Only when no category's regular expression matches the purpose
line SHALL the system consider the categories whose date windows cover the transaction's booking
date. A transaction matched by no expression and covered by no window SHALL be uncategorised. This
ordering SHALL hold under re-evaluation, so a transaction that gains an expression match after a
category change SHALL stop being held by a date window.

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
