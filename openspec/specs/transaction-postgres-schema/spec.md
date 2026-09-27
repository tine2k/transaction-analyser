# Transaction Postgres Schema Specification

## Purpose

Defines how the `Transaction` domain model is represented in a PostgreSQL database: the table and column shape, the column types and nullability that preserve the domain's guarantees, the key strategy, and the boundary between structural constraints and deferred business validation.

## Requirements

### Requirement: One row per transaction, held in a single table

The system SHALL represent a `Transaction` as exactly one row in a single PostgreSQL table named `transactions`. The table SHALL hold one column for each of the six `Transaction` data elements, and storing or retrieving a transaction SHALL NOT require reading, joining, or referencing any other table.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Booking date | `booking_date` | Required |
| Value date | `value_date` | Required |
| Amount | `amount` | Required |
| Purpose line | `purpose` | Required |
| Counterparty name | `counterparty_name` | Required |
| Counterparty account | `counterparty_account` | Optional |

The `id` column is a storage concern only; it is not a domain element, and the six domain elements remain the complete set of domain data.

#### Scenario: A complete transaction is stored on one row

- **WHEN** a transaction is stored with a booking date, a value date, an amount, a purpose, a counterparty name, and a counterparty account
- **THEN** all seven values are held on a single row of `transactions`, and no other table is read or written to store it

#### Scenario: A transaction needs no dependent table

- **WHEN** a transaction is stored with a booking date, a value date, an amount, a purpose, and a counterparty name but no counterparty account
- **THEN** the row is written successfully and no account, counterparty, or bank-statement table is required to exist

#### Scenario: The row is indivisible

- **WHEN** a stored transaction is read
- **THEN** the booking date, value date, amount, purpose, counterparty name, and counterparty account are read from that one row as a single unit, and are never split across rows or tables

### Requirement: Column types preserve the domain's type guarantees

The system SHALL use PostgreSQL column types that cannot represent a value the domain model declares unrepresentable. The two dates SHALL use the `date` type, so that no time of day is storable. The amount SHALL use an exact decimal numeric type, so that no value is lost to binary floating-point rounding. The purpose, counterparty name, and counterparty account SHALL use a text type, so that no length limit or structure is imposed on them. The table SHALL NOT contain a currency column, and SHALL NOT contain a separate direction, type, or flag column.

#### Scenario: Dates cannot hold a time of day

- **WHEN** a booking date or value date is written to `transactions`
- **THEN** the value is stored at day precision, and the schema offers no column in which a time of day could be held

#### Scenario: The amount keeps its exact value

- **WHEN** an amount with a fractional part, such as -42.75, is written to `amount`
- **THEN** the stored value reads back as exactly -42.75, with no floating-point approximation

#### Scenario: Free text is not length-limited or structured

- **WHEN** a long or irregular purpose, counterparty name, or counterparty account is written
- **THEN** the full text is stored as given, and the schema imposes no maximum length and no internal structure on it

#### Scenario: No currency is expressible

- **WHEN** a row of `transactions` is inspected
- **THEN** the row carries no column in which a currency other than EUR could be recorded, consistent with the domain model's rule that the amount is denominated in EUR

### Requirement: Required elements are rejected when absent

The system SHALL reject a write that omits any of the five required elements — booking date, value date, amount, purpose, counterparty name — and SHALL accept a row with no counterparty account. The table SHALL reject a row whose amount is zero.

#### Scenario: A row missing a required element is rejected

- **WHEN** a write omits the value date, the amount, the purpose, or the counterparty name
- **THEN** the database rejects the write and no row is created

#### Scenario: A missing counterparty account is accepted

- **WHEN** a cash withdrawal is stored with a counterparty name and no counterparty account
- **THEN** the row is accepted and the counterparty account reads as absent rather than as an empty identifier

#### Scenario: A zero amount is rejected

- **WHEN** a write sets the amount to 0.00
- **THEN** the database rejects the write, because a zero amount carries no direction and therefore cannot express the domain's signed-amount convention

#### Scenario: Presence is not emptiness

- **WHEN** a row is written with a purpose that is the empty string
- **THEN** the write is accepted, since a required element means the value is present, not that it is non-empty

### Requirement: Money direction is the stored sign alone

The system SHALL store the amount's sign exactly as given, so that a positive amount reads as money in and a negative amount as money out. The system SHALL NOT derive, store, or allow a second column to state the direction, and SHALL NOT permit the stored sign to be contradicted by any other part of the row.

#### Scenario: Incoming and outgoing amounts keep their sign

- **WHEN** an amount of 250.00 EUR is stored and an amount of -42.75 EUR is stored
- **THEN** the first row reads as money in and the second as money out, determined from the stored sign alone

#### Scenario: There is no second source of direction

- **WHEN** the direction of a stored transaction is needed
- **THEN** it is read from the sign of `amount`, and the row offers no other column that could state a conflicting direction

### Requirement: Every stored transaction has a stable identity

The system SHALL give each row of `transactions` a surrogate identity that the database generates and maintains, and SHALL use it as the row's primary key. The system SHALL NOT require the six domain elements to be unique, and SHALL NOT add a natural-key unique constraint over them.

#### Scenario: Rows are distinguishable without a domain key

- **WHEN** two transactions are stored that share the same booking date, value date, amount, purpose, and counterparty
- **THEN** both rows are stored successfully and each is addressable by its own distinct surrogate identity

#### Scenario: The identity is generated by the database

- **WHEN** a row is inserted without supplying an identity
- **THEN** the database assigns the identity, and the row's primary key cannot be left empty

#### Scenario: The identity is not a domain element

- **WHEN** a stored transaction is mapped back to the domain model
- **THEN** the surrogate identity is storage metadata and does not appear as a seventh domain data element

### Requirement: The schema carries no business validation

The system SHALL express only structural guarantees in the schema: column types, presence, and the primary key. The system SHALL NOT add a constraint that validates IBAN format or checksum, SHALL NOT add a constraint relating the value date to the booking date, and SHALL NOT add a constraint on the length or content of free text. If a business rule is later decided, it SHALL arrive as its own change rather than being folded into this one.

#### Scenario: An out-of-order pair of dates is accepted

- **WHEN** a transaction is stored whose value date is earlier than its booking date
- **THEN** the write is accepted, because the domain model has not defined a rule about date ordering

#### Scenario: A malformed counterparty account is accepted

- **WHEN** a transaction is stored with a counterparty account that is not a well-formed IBAN
- **THEN** the write is accepted, because IBAN validation has not been decided and remains the responsibility of the code that writes the row

#### Scenario: No derived or extra data is stored

- **WHEN** the schema is read in full
- **THEN** it consists of the table, its seven columns, and its primary key, and contains no additional table, column, trigger, function, or derived value
