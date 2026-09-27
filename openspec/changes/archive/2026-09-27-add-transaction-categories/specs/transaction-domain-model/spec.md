# Spec Delta

## MODIFIED Requirements

### Requirement: Transaction aggregate

The system SHALL recognise a `Transaction` as the single main aggregate of the domain. A `Transaction` SHALL be the sole unit that carries a booking date, a value date, an EUR amount, a purpose line, a counterparty, and a category. The system SHALL NOT require any other entity for a `Transaction` to be well-formed: a transaction with no category is as well-formed as a transaction with one.

The seven data elements of a `Transaction` are:

| Element | Type | Presence | Meaning |
| --- | --- | --- | --- |
| Booking date | Calendar date (day precision) | Required | The day the account holder's bank posted the transaction. |
| Value date | Calendar date (day precision) | Required | The day the money was economically available. |
| Amount | Signed decimal, EUR | Required | The money moved, with direction carried by the sign. |
| Purpose line | Free text | Required | The human-readable description accompanying the transaction. |
| Counterparty name | Free text | Required | The name of the other party to the transaction. |
| Counterparty account | IBAN (text) | Optional | The other party's account identifier, when one exists. |
| Category | Category reference | Optional | The named group the transaction belongs to, when one has been assigned. |

#### Scenario: A complete transaction is representable

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, a counterparty name, a counterparty account, and a category
- **THEN** all seven data elements are held on that single transaction

#### Scenario: Transaction requires no other aggregate

- **WHEN** a transaction is described with only its own six non-category data elements and no category
- **THEN** the transaction is fully described without any additional entity, account aggregate, or counterparty record, and the absence of a category does not make it incomplete

#### Scenario: Counterparty account may be absent

- **WHEN** a transaction is described with a cash withdrawal or a card payment, where the other party has no account identifier
- **THEN** the transaction is well-formed without a counterparty account, and the counterparty account reads as absent

#### Scenario: A transaction is a whole unit

- **WHEN** a transaction is observed, retrieved, or otherwise handled
- **THEN** it is handled as a single indivisible unit whose booking date, value date, amount, purpose line, counterparty, and category are read together as one thing, and are never split apart into separate representations of the same transaction

### Requirement: Purpose line is free text

The system SHALL hold the purpose line as free text exactly as it is given, and SHALL NOT impose a structure, vocabulary, or interpretation on it. The system SHALL NOT parse the purpose line into fields, and SHALL NOT derive any value from it other than the result of matching a category's regular expression against it. Matching a category's regular expression against the purpose line SHALL NOT alter, reformat, or replace the text, and SHALL NOT require the text to conform to any shape.

#### Scenario: Purpose text is preserved verbatim

- **WHEN** a transaction is described with the purpose line "Supermarket purchase card payment"
- **THEN** the purpose line is held as that text, and is reported as that text

#### Scenario: Purpose line carries no structure

- **WHEN** a transaction's purpose line is read
- **THEN** it is reported as a single line of unstructured text, and no parsed fields are derived from it

#### Scenario: A category is derived by matching, not by parsing

- **WHEN** a category's regular expression is applied to a purpose line and a category is assigned
- **THEN** that assignment is the only value derived from the purpose line, and the purpose line itself is unchanged, still unstructured, and still reported as given

#### Scenario: An unmatched purpose line is not an error

- **WHEN** a purpose line is matched by no category's regular expression
- **THEN** the purpose line is held and reported unchanged, and the transaction remains well-formed and uncategorised

## ADDED Requirements

### Requirement: A category is a name and a regular expression over the purpose line

The system SHALL define a `Category` as exactly two elements: a name that identifies it, and a regular expression that states which transactions it covers. The regular expression SHALL be applied to the purpose line of a transaction, and SHALL be the definition of the category's membership: a transaction falls within a category when its purpose line is matched by that category's regular expression. The system SHALL NOT define a category by any other means, and SHALL NOT require a category to carry any element beyond its name and its regular expression.

#### Scenario: A category is configured with a name and a regular expression

- **WHEN** a category is configured with the name "Groceries" and the regular expression `(?i)rewe|edeka`
- **THEN** the category holds that name and that regular expression, and no third element

#### Scenario: The regular expression alone defines membership

- **WHEN** a transaction's purpose line is matched by a category's regular expression
- **THEN** the transaction falls within that category by that match alone, and no other property of the transaction, the purpose line, or the category decides membership

#### Scenario: A category carries nothing beyond its name and expression

- **WHEN** a category is read
- **THEN** it exposes a name and a regular expression, and no third element that defines or qualifies which transactions it covers

### Requirement: A transaction's category is optional and uncategorised is a state of its own

The system SHALL treat a transaction's category as optional, and SHALL hold a transaction that has no category as well-formed. A transaction with no category SHALL read as uncategorised, and the system SHALL NOT represent that state as a category named for the absence of one, as an empty category, or as a default, catch-all, or fallback category. A category SHALL NOT be required for a transaction to be stored, reported, or analysed. Configuring a category's regular expression SHALL NOT by itself assign that category to any transaction; a transaction's category SHALL change only when the regular expression has been applied to its purpose line.

#### Scenario: A transaction with no category is well-formed

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, and a counterparty, and no category
- **THEN** the transaction is well-formed, and its category reads as absent

#### Scenario: Uncategorised is not a category

- **WHEN** a transaction's category is read and no category was assigned to it
- **THEN** the category reads as absent, and no category exists whose meaning is the absence of a category

#### Scenario: Configuring a category assigns nothing

- **WHEN** a category with a regular expression is configured, and that regular expression has not been applied to any purpose line
- **THEN** every transaction is uncategorised, including transactions whose purpose line the regular expression would match

### Requirement: A transaction holds at most one category, and precedence between patterns is undecided

A transaction SHALL hold at most one category: assigning a category to a transaction that already has one SHALL replace the previous category rather than add a second. The domain model SHALL NOT define an evaluation order among categories' regular expressions, a case-sensitivity rule, a whole-string or partial matching rule, or an outcome for a purpose line that more than one category's regular expression matches. Each of those decisions SHALL arrive as its own change rather than being settled here.

#### Scenario: Assigning a category again replaces the previous one

- **WHEN** a category is assigned to a transaction that already holds a different category
- **THEN** the transaction holds only the newly assigned category, and the previous one is no longer held

#### Scenario: Two categories never coexist on one transaction

- **WHEN** a transaction's category is read
- **THEN** at most one category is held, and no transaction can hold two categories at once

#### Scenario: Overlapping patterns have no defined outcome

- **WHEN** the regular expressions of two different categories both match a single purpose line
- **THEN** the model defines no resulting category, and no outcome is implied by the mere existence of both categories
