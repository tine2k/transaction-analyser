# Spec Delta

## Purpose

Defines the core domain vocabulary of the transaction analyser: the `Transaction` aggregate, the fields it carries, how money direction is expressed, and the shape of the counterparty. This capability is the contract that any later persistence, import, or analysis work must conform to.

## ADDED Requirements

### Requirement: Transaction aggregate

The system SHALL recognise a `Transaction` as the single main aggregate of the domain. A `Transaction` SHALL be the sole unit that carries a booking date, a value date, a EUR amount, a purpose line, and a counterparty. The system SHALL NOT require any other entity for a `Transaction` to be well-formed.

The six data elements of a `Transaction` are:

| Element | Type | Presence | Meaning |
| --- | --- | --- | --- |
| Booking date | Calendar date (day precision) | Required | The day the account holder's bank posted the transaction. |
| Value date | Calendar date (day precision) | Required | The day the money was economically available. |
| Amount | Signed decimal, EUR | Required | The money moved, with direction carried by the sign. |
| Purpose line | Free text | Required | The human-readable description accompanying the transaction. |
| Counterparty name | Free text | Required | The name of the other party to the transaction. |
| Counterparty account | IBAN (text) | Optional | The other party's account identifier, when one exists. |

#### Scenario: A complete transaction is representable

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, a counterparty name, and a counterparty account
- **THEN** all six data elements are held on that single transaction

#### Scenario: Transaction requires no other aggregate

- **WHEN** a transaction is described with only its own six data elements
- **THEN** the transaction is fully described without any additional entity, account aggregate, or counterparty record

#### Scenario: Counterparty account may be absent

- **WHEN** a transaction is described with a cash withdrawal or a card payment, where the other party has no account identifier
- **THEN** the transaction is well-formed without a counterparty account, and the counterparty account reads as absent

#### Scenario: A transaction is a whole unit

- **WHEN** a transaction is observed, retrieved, or otherwise handled
- **THEN** it is handled as a single indivisible unit whose booking date, value date, amount, purpose line, and counterparty are never split apart

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

The system SHALL hold the purpose line as free text exactly as it is given, and SHALL NOT impose a structure, vocabulary, or interpretation on it. The system SHALL NOT treat the purpose line as a categorisation, and SHALL NOT derive any category from it.

#### Scenario: Purpose text is preserved verbatim

- **WHEN** a transaction is described with the purpose line "Supermarket purchase card payment"
- **THEN** the purpose line is held as that text, and is reported as that text

#### Scenario: Purpose line carries no structure

- **WHEN** a transaction's purpose line is read
- **THEN** it is reported as a single line of unstructured text, and no parsed fields are derived from it

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
