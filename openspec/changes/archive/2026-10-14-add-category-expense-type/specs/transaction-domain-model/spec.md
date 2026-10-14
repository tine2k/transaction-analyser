# Spec Delta

## MODIFIED Requirements

### Requirement: A category is a name and a regular expression over the purpose line and the counterparty name

The system SHALL define a `Category` as a name that identifies it, one or more
regular expressions that state which transactions it covers by purpose line or
counterparty name, a `hidden` flag that states whether the category is out of scope
for the analysis views, a set of zero or more date windows that state a bounded
period whose transactions it covers, and an expense type that classifies the
category's spending as recurring, one-time, or unset. The expressions SHALL be applied to the purpose
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
covers a transaction exactly as a visible one does. The expense type SHALL NOT take
part in membership: a category classified recurring, one-time, or unset covers a
transaction exactly as its expressions and windows define. A category SHALL carry at least
one regular expression or at least one date window; a category carrying neither is
not a well-formed category, because it would define no membership. The system SHALL
NOT define a category by any other means, and SHALL NOT require a category to carry
any element beyond its name, its regular expressions, its hidden flag, its date
windows, and its expense type.

#### Scenario: A category is configured with a name and a regular expression

- **WHEN** a category is configured with the name "Urlaub", the regular expressions `rewe` and `edeka`, hidden `false`, the window 2026-07-01 to 2026-07-14, and the expense type `recurring`
- **THEN** the category holds that name, both regular expressions, that hidden flag, that window, and that expense type, and no sixth element

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
- **THEN** it exposes a name, one or more regular expressions or at least one date window, a hidden flag, its date windows, and its expense type, and no sixth element that defines or qualifies which transactions it covers

#### Scenario: A hidden category still defines membership

- **WHEN** a category is hidden and its regular expression matches a purpose line
- **THEN** the transaction falls within that hidden category, because hiding does not change which transactions the expressions match

#### Scenario: An unset expense type is well-formed

- **WHEN** a category carries no expense type
- **THEN** the category is well-formed and covers exactly the transactions its regular expressions and date windows define

#### Scenario: The expense type does not decide membership

- **WHEN** a category classified `one-time` has a regular expression that matches a purpose line
- **THEN** the transaction falls within that category, because the classification does not change which transactions the expressions match

#### Scenario: Changing the expense type changes no membership

- **WHEN** a category's expense type changes from unset to `recurring`
- **THEN** the transactions the category covers are unchanged

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
