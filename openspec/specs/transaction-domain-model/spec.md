# Transaction Domain Model Specification

## Purpose

Defines the core domain vocabulary of the transaction analyser: the `Transaction` aggregate, the fields it carries, how money direction is expressed, and the shape of the counterparty. This capability is the contract that any later persistence, import, or analysis work must conform to.

## Requirements

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

### Requirement: Dates are separate and day-precise

The system SHALL hold the booking date and the value date as two distinct elements of a `Transaction`, each carrying a calendar date at day precision. The system SHALL NOT collapse the booking date and the value date into a single date, and SHALL NOT record a time of day for either.

#### Scenario: Both dates are held independently

- **WHEN** a transaction is described with a booking date of 2026-03-02 and a value date of 2026-03-01
- **THEN** the transaction exposes the booking date as 2026-03-02 and the value date as 2026-03-01, and the two are reported as separate values

#### Scenario: Booking date and value date may be equal

- **WHEN** a transaction is described where the booking date and the value date are the same day
- **THEN** both dates are recorded as that same day and the transaction is still well-formed

#### Scenario: Dates carry no time component

- **WHEN** a transaction's booking date or value date is recorded
- **THEN** only a calendar date is held, and no time of day is available on either date

### Requirement: Amount is a signed EUR value

The system SHALL hold the transaction amount as a single signed decimal value denominated in EUR, and SHALL use the sign to express the direction of the money movement. A positive amount SHALL mean money came in to the account holder; a negative amount SHALL mean money went out. The system SHALL NOT require or expose a separate direction, type, or flag to state which way the money moved.

#### Scenario: Incoming transaction is positive

- **WHEN** a transaction is described with an amount of 250.00 EUR
- **THEN** the transaction reads as 250.00 EUR of money coming in, with no additional direction field set

#### Scenario: Outgoing transaction is negative

- **WHEN** a transaction is described with an amount of -42.75 EUR
- **THEN** the transaction reads as 42.75 EUR of money going out, with no additional direction field set

#### Scenario: Direction is readable from the amount alone

- **WHEN** the direction of a transaction's money movement is needed
- **THEN** it is determined from the sign of the amount alone, and the same conclusion cannot be contradicted by any other part of the transaction

#### Scenario: Amount is denominated in EUR

- **WHEN** an amount is held on a transaction
- **THEN** it is an amount in EUR, and amounts in other currencies are not representable on a transaction

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

### Requirement: Counterparty is name plus optional account

The system SHALL hold the counterparty as a name together with an account identifier expressed as a single IBAN string, and SHALL hold that account identifier as optional rather than required. The system SHALL NOT model the counterparty as a separate aggregate or entity that transactions refer to, and SHALL NOT require a counterparty to be looked up elsewhere.

#### Scenario: Counterparty with an account

- **WHEN** a transaction is described with the counterparty name "ACME GmbH" and counterparty account "DE89370400440532013000"
- **THEN** the transaction holds the name "ACME GmbH" and the single IBAN "DE89370400440532013000" as the counterparty's account

#### Scenario: Counterparty name only

- **WHEN** a transaction is described with the counterparty name "Cash withdrawal" and no counterparty account
- **THEN** the transaction holds the counterparty name and reports the counterparty account as absent

#### Scenario: Counterparty is held on the transaction itself

- **WHEN** the counterparty of a transaction is needed
- **THEN** it is read from that transaction directly, and reading it requires no counterparty aggregate, lookup, or registry to exist

### Requirement: A category is a name and a regular expression over the purpose line

The system SHALL define a `Category` as a name that identifies it, one or more
regular expressions that state which transactions it covers by purpose line, a
`hidden` flag that states whether the category is out of scope for the analysis
views, and a set of zero or more date windows that state a bounded period whose
transactions it covers. The expressions SHALL be applied to the purpose line of a
transaction, and the date windows SHALL be applied to the transaction's booking
date. A date window SHALL consist of a `from` date and a `to` date, each a full
calendar date at day precision with no time of day, and SHALL be inclusive: a
transaction falls in the window exactly when its booking date is on or after the
window's `from` and on or before its `to`. A category's expressions SHALL be
alternatives, and its windows SHALL be alternatives: the category covers a
transaction when its purpose line matches at least one expression, or when no
category's expression matches the purpose line and its booking date falls in at
least one of the category's windows. The `hidden` flag SHALL NOT take part in
membership: a hidden category covers a transaction exactly as a visible one does.
A category SHALL carry at least one regular expression or at least one date window;
a category carrying neither is not a well-formed category, because it would define
no membership. The system SHALL NOT define a category by any other means, and SHALL
NOT require a category to carry any element beyond its name, its regular
expressions, its hidden flag, and its date windows.

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

### Requirement: A transaction's category is optional, and configuring a category applies the expressions

The system SHALL treat a transaction's category as optional, and SHALL hold a
transaction that has no category as well-formed. A transaction with no category
SHALL read as uncategorised, and the system SHALL NOT represent that state as a
category named for the absence of one, as an empty category, or as a default,
catch-all, or fallback category. A category SHALL NOT be required for a transaction
to be stored, reported, or analysed. A transaction's category SHALL change only as
the result of applying the categories' regular expressions to its purpose line or,
when no category's expression matches, applying the categories' date windows to its
booking date, as the `category-assignment` capability defines. Configuring, editing,
or deleting a category SHALL apply the current regular expressions and date windows
to every transaction, so a transaction's category changes as a consequence of such
a change.

#### Scenario: A transaction with no category is well-formed

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, and a counterparty, and no category
- **THEN** the transaction is well-formed, and its category reads as absent

#### Scenario: Uncategorised is not a category

- **WHEN** a transaction's category is read and no category was assigned to it
- **THEN** the category reads as absent, and no category exists whose meaning is the absence of a category

#### Scenario: Configuring a category applies the expressions

- **WHEN** a category with a regular expression is configured
- **THEN** the current regular expressions are applied to every transaction's purpose line, and a transaction whose purpose line is matched holds the winning category

#### Scenario: Configuring a category applies the date windows

- **WHEN** a category with a date window is configured and no category's regular expression matches a transaction's purpose line
- **THEN** the current date windows are applied to every transaction, and a transaction whose booking date falls in the window holds the winning category

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

