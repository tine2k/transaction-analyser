# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: A category is a name and a regular expression over the purpose line`
- TO: `### Requirement: A category is a name and a regular expression over the purpose line and the counterparty name`

## MODIFIED Requirements

### Requirement: A category is a name and a regular expression over the purpose line and the counterparty name

The system SHALL define a `Category` as a name that identifies it, one or more
regular expressions that state which transactions it covers by purpose line or
counterparty name, a `hidden` flag that states whether the category is out of scope
for the analysis views, and a set of zero or more date windows that state a bounded
period whose transactions it covers. The expressions SHALL be applied to the purpose
line and the counterparty name of a transaction, and the date windows SHALL be
applied to the transaction's booking date. A date window SHALL consist of a `from`
date and a `to` date, each a full calendar date at day precision with no time of
day, and SHALL be inclusive: a transaction falls in the window exactly when its
booking date is on or after the window's `from` and on or before its `to`. A
category's expressions SHALL be alternatives, and its windows SHALL be alternatives:
the category covers a transaction when its purpose line or counterparty name matches
at least one expression, or when no category's expression matches the purpose line
or the counterparty name and its booking date falls in at least one of the category's
windows. The `hidden` flag SHALL NOT take part in membership: a hidden category
covers a transaction exactly as a visible one does. A category SHALL carry at least
one regular expression or at least one date window; a category carrying neither is
not a well-formed category, because it would define no membership. The system SHALL
NOT define a category by any other means, and SHALL NOT require a category to carry
any element beyond its name, its regular expressions, its hidden flag, and its date
windows.

#### Scenario: A category is configured with a name and a regular expression

- **WHEN** a category is configured with the name "Urlaub", the regular expressions `rewe` and `edeka`, hidden `false`, and the window 2026-07-01 to 2026-07-14
- **THEN** the category holds that name, both regular expressions, that hidden flag, and that window, and no fifth element

#### Scenario: A category may be defined by date windows alone

- **WHEN** a category is configured with the name "Urlaub", no regular expression, and the window 2026-07-01 to 2026-07-14
- **THEN** the category is well-formed, because a date window defines membership just as an expression does

#### Scenario: The regular expression alone defines membership

- **WHEN** a transaction's purpose line is matched by at least one of a category's regular expressions
- **THEN** the transaction falls within that category by that match alone, and the other expressions and the windows of that category need not match for membership

#### Scenario: The date window alone defines membership

- **WHEN** no category's regular expression matches a purpose line and a category's window 2026-07-01 to 2026-07-14 covers the transaction's booking date
- **THEN** the transaction falls within that category by the window alone, and the category's other elements need not decide membership

#### Scenario: A category carries nothing beyond its name and expression

- **WHEN** a category is read
- **THEN** it exposes a name, one or more regular expressions or at least one date window, a hidden flag, and its date windows, and no fifth element that defines or qualifies which transactions it covers

#### Scenario: A hidden category still defines membership

- **WHEN** a category is hidden and its regular expression matches a purpose line
- **THEN** the transaction falls within that hidden category, because hiding does not change which transactions the expressions match

#### Scenario: Any one expression defines membership

- **WHEN** a category holds several expressions and only one of them matches a purpose line
- **THEN** the transaction falls within that category, because its expressions are alternatives

#### Scenario: The expressions together define membership

- **WHEN** a purpose line is matched by none of a category's regular expressions and the transaction's booking date falls in none of that category's windows
- **THEN** the transaction does not fall within that category by that category's own elements, even though it may fall within another

#### Scenario: A counterparty-name match defines membership

- **WHEN** a transaction's purpose line matches none of a category's expressions and its counterparty name matches one of them
- **THEN** the transaction falls within that category by that match alone, and the category's other elements need not decide membership

#### Scenario: An expression covers both texts

- **WHEN** a category is read
- **THEN** its regular expressions define membership by the transaction's purpose line and its counterparty name, and no expression is restricted to one of the two

### Requirement: A transaction's category is optional, and configuring a category applies the expressions

The system SHALL treat a transaction's category as optional, and SHALL hold a
transaction that has no category as well-formed. A transaction with no category
SHALL read as uncategorised, and the system SHALL NOT represent that state as a
category named for the absence of one, as an empty category, or as a default,
catch-all, or fallback category. A category SHALL NOT be required for a transaction
to be stored, reported, or analysed. A transaction's category SHALL change only as
the result of applying the categories' regular expressions to its purpose line or
counterparty name or, when no category's expression matches, applying the
categories' date windows to its booking date, as the `category-assignment` capability
defines. Configuring, editing, or deleting a category SHALL apply the current regular
expressions and date windows to every transaction, so a transaction's category
changes as a consequence of such a change.

#### Scenario: A transaction with no category is well-formed

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, and a counterparty, and no category
- **THEN** the transaction is well-formed, and its category reads as absent

#### Scenario: Uncategorised is not a category

- **WHEN** a transaction's category is read and no category was assigned to it
- **THEN** the category reads as absent, and no category exists whose meaning is the absence of a category

#### Scenario: Configuring a category applies the expressions

- **WHEN** a category with a regular expression is configured
- **THEN** the current regular expressions are applied to every transaction's purpose line, and a transaction whose purpose line is matched holds the winning category

#### Scenario: Configuring a category applies the expressions to the counterparty name

- **WHEN** a category with a regular expression is configured and a transaction's counterparty name matches it
- **THEN** the current regular expressions are applied, and the transaction holds the winning category

#### Scenario: Configuring a category applies the date windows

- **WHEN** a category with a date window is configured and no category's regular expression matches a transaction's purpose line
- **THEN** the current date windows are applied to every transaction, and a transaction whose booking date falls in the window holds the winning category

### Requirement: A transaction holds at most one category, and the matching category is chosen by smallest identity

A transaction SHALL hold at most one category: assigning a category to a transaction that
already has one SHALL replace the previous category rather than add a second. A transaction whose
purpose line or counterparty name more than one category's regular expression matches SHALL be
assigned the matching category whose storage identity is smallest, as the `category-assignment`
capability defines, so that the outcome of overlapping patterns is decided and stable. Matching
SHALL be case-insensitive and SHALL succeed on a part of the purpose line or the counterparty name
rather than requiring the whole text.

#### Scenario: Assigning a category again replaces the previous one

- **WHEN** a category is assigned to a transaction that already holds a different category
- **THEN** the transaction holds only the newly assigned category, and the previous one is no longer held

#### Scenario: Two categories never coexist on one transaction

- **WHEN** a transaction's category is read
- **THEN** at most one category is held, and no transaction can hold two categories at once

#### Scenario: Overlapping patterns have a defined outcome

- **WHEN** the regular expressions of two different categories both match a single purpose line
- **THEN** the transaction holds the matching category with the smallest identity

#### Scenario: Overlapping patterns match through the counterparty name

- **WHEN** the regular expressions of two different categories both match a single counterparty name
- **THEN** the transaction holds the matching category with the smallest identity
