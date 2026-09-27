# Spec Delta

## REMOVED Requirements

### Requirement: A transaction's category is optional and uncategorised is a state of its own

**Reason**: Configuring a category no longer leaves transactions untouched. This change applies
the stored regular expressions to every transaction's purpose line whenever the set of
categories changes, so the rule that configuring assigns nothing, and its scenario, no longer
hold. The behavior is replaced by the added requirement below together with the
`category-assignment` capability.

**Migration**: No stored data and no schema change. The guarantees that a category is optional
and that uncategorised is a state of its own are carried forward unchanged by the replacement
requirement.

### Requirement: A transaction holds at most one category, and precedence between patterns is undecided

**Reason**: Precedence is no longer undecided. This change defines case-insensitive substring
matching and resolves overlapping matches by the smallest category identity, as the
`category-assignment` capability defines, so the scenario that overlapping patterns have no
defined outcome no longer holds.

**Migration**: No stored data and no schema change. The at-most-one-category guarantee is carried
forward, and the outcome of overlapping patterns is now defined by the replacement requirement.

## ADDED Requirements

### Requirement: A transaction's category is optional, and configuring a category applies the expressions

The system SHALL treat a transaction's category as optional, and SHALL hold a transaction that
has no category as well-formed. A transaction with no category SHALL read as uncategorised, and
the system SHALL NOT represent that state as a category named for the absence of one, as an
empty category, or as a default, catch-all, or fallback category. A category SHALL NOT be
required for a transaction to be stored, reported, or analysed. A transaction's category SHALL
change only as the result of applying categories' regular expressions to its purpose line.
Configuring, editing, or deleting a category SHALL apply the current regular expressions to
every transaction's purpose line, as the `category-assignment` capability defines, so a
transaction's category changes as a consequence of such a change.

#### Scenario: A transaction with no category is well-formed

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, and a counterparty, and no category
- **THEN** the transaction is well-formed, and its category reads as absent

#### Scenario: Uncategorised is not a category

- **WHEN** a transaction's category is read and no category was assigned to it
- **THEN** the category reads as absent, and no category exists whose meaning is the absence of a category

#### Scenario: Configuring a category applies the expressions

- **WHEN** a category with a regular expression is configured
- **THEN** the current regular expressions are applied to every transaction's purpose line, and a transaction whose purpose line is matched holds the winning category

### Requirement: A transaction holds at most one category, and the matching category is chosen by smallest identity

A transaction SHALL hold at most one category: assigning a category to a transaction that
already has one SHALL replace the previous category rather than add a second. A purpose line that
more than one category's regular expression matches SHALL be assigned the matching category
whose storage identity is smallest, as the `category-assignment` capability defines, so that the
outcome of overlapping patterns is decided and stable. Matching SHALL be case-insensitive and
SHALL succeed on a part of the purpose line rather than requiring the whole line.

#### Scenario: Assigning a category again replaces the previous one

- **WHEN** a category is assigned to a transaction that already holds a different category
- **THEN** the transaction holds only the newly assigned category, and the previous one is no longer held

#### Scenario: Two categories never coexist on one transaction

- **WHEN** a transaction's category is read
- **THEN** at most one category is held, and no transaction can hold two categories at once

#### Scenario: Overlapping patterns have a defined outcome

- **WHEN** the regular expressions of two different categories both match a single purpose line
- **THEN** the transaction holds the matching category with the smallest identity
