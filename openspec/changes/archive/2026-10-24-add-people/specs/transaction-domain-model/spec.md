# Spec Delta

## MODIFIED Requirements

### Requirement: Transaction aggregate

The system SHALL recognise a `Transaction` as the single main aggregate of the domain. A `Transaction` SHALL be the sole unit that carries a booking date, a value date, an EUR amount, a purpose line, a counterparty, a person, and a category. A transaction with no category is as well-formed as a transaction with one, while a transaction without a person is not well-formed.

The eight data elements of a `Transaction` are:

| Element | Type | Presence | Meaning |
| --- | --- | --- | --- |
| Booking date | Calendar date (day precision) | Required | The day the account holder's bank posted the transaction. |
| Value date | Calendar date (day precision) | Required | The day the money was economically available. |
| Amount | Signed decimal, EUR | Required | The money moved, with direction carried by the sign. |
| Purpose line | Free text | Required | The human-readable description accompanying the transaction. |
| Counterparty name | Free text | Required | The name of the other party to the transaction. |
| Counterparty account | IBAN (text) | Optional | The other party's account identifier, when one exists. |
| Person | Person reference | Required | The named owner whose transaction this is. |
| Category | Category reference | Optional | The named group the transaction belongs to, when one has been assigned. |

#### Scenario: A complete transaction is representable

- **WHEN** a transaction is described with a booking date, a value date, an amount, a purpose line, a counterparty name, a counterparty account, a person, and a category
- **THEN** all eight data elements are held on that single transaction

#### Scenario: Transaction requires no other aggregate

- **WHEN** a transaction is described with its required elements and a person, and with no category
- **THEN** the transaction is fully described without a bank-account aggregate or a counterparty record, because the person is the only additional entity it references

#### Scenario: A transaction without a person is incomplete

- **WHEN** a transaction is described without a person
- **THEN** the transaction is not well-formed, because the owner of the transaction is required

#### Scenario: Counterparty account may be absent

- **WHEN** a transaction is described with a cash withdrawal or a card payment, where the other party has no account identifier
- **THEN** the transaction is well-formed without a counterparty account, and the counterparty account reads as absent

#### Scenario: A transaction is a whole unit

- **WHEN** a transaction is observed, retrieved, or otherwise handled
- **THEN** it is handled as a single indivisible unit whose booking date, value date, amount, purpose line, counterparty, person, and category are read together as one thing, and are never split apart into separate representations of the same transaction

## ADDED Requirements

### Requirement: A transaction's person is its owner, distinct from the counterparty

The system SHALL hold a transaction's person as the named owner of that transaction and the counterparty as the other side. The person SHALL be a reference to a named entity with a stable identity; the transaction SHALL hold the reference, not a copy of the name. A person's name SHALL be changeable without changing the reference. The person SHALL NOT be an account, a login, a session, or a counterparty.

#### Scenario: Owner and counterparty are different roles

- **WHEN** a transaction is described with the person `Me` and the counterparty `ACME GmbH`
- **THEN** `Me` identifies whose transaction it is and `ACME GmbH` identifies the other side, and neither value substitutes for the other

#### Scenario: The person is held by reference

- **WHEN** a transaction is read
- **THEN** its person is obtained by following the stored reference to the named person, and the person's name is not copied onto the transaction

#### Scenario: A renamed person is the same owner

- **WHEN** a person referenced by a transaction is renamed
- **THEN** the transaction still references that same person and reads the new name

#### Scenario: A person is not an account or a login

- **WHEN** a transaction's person is read
- **THEN** the person identifies the owner of the expense and does not authenticate, authorise, or identify a bank account or a session
