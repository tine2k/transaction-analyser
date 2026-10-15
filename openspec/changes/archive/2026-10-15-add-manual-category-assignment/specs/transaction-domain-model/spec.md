# Spec Delta

## MODIFIED Requirements

### Requirement: A transaction's category is optional, and configuring a category applies the expressions

The system SHALL treat a transaction's category as optional, and SHALL hold a
transaction that has no category as well-formed. A transaction with no category
SHALL read as uncategorised, and the system SHALL NOT represent that state as a
category named for the absence of one, as an empty category, or as a default,
catch-all, or fallback category. A category SHALL NOT be required for a transaction
to be stored, reported, or analysed. A transaction's category SHALL change only as
the result of applying the categories' regular expressions to its purpose line or
counterparty name, applying the categories' date windows to its booking date when no
expression matches, as the `category-assignment` capability defines, or an explicit
manual assignment that names a stored category. A manual assignment SHALL take
precedence over the applying rules until it is cleared or its category is deleted.
Configuring, editing, or deleting a category SHALL apply the current regular
expressions and date windows to every transaction that is not manually assigned, so a
transaction's category changes as a consequence of such a change unless a manual
assignment holds it.

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

#### Scenario: A manual assignment changes the category without applying any expression

- **WHEN** a manual assignment naming a stored category is made for a transaction whose purpose line and counterparty name match nothing
- **THEN** the transaction holds the named category, and no regular expression or date window decided it

#### Scenario: Configuring a category leaves a manual assignment in place

- **WHEN** a category with a regular expression is configured and it matches a manually assigned transaction's purpose line or counterparty name
- **THEN** the transaction keeps the category its manual assignment names
