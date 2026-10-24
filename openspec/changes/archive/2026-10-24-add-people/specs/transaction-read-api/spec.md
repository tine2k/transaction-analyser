# Spec Delta

## MODIFIED Requirements

### Requirement: A returned transaction carries its seven domain elements

Each transaction object SHALL carry the eight `Transaction` data elements defined by the
`transaction-domain-model` capability, together with the row's storage identity. The fields SHALL be
named exactly `id`, `bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`,
`counterpartyAccount`, `person`, and `category`. The `id` field SHALL be the row's storage identity
rendered as a string, and is storage metadata rather than a ninth domain element. The two dates SHALL
be rendered as calendar dates in `YYYY-MM-DD` form, with no time of day. The amount SHALL be rendered
as a decimal string that preserves the stored sign and exact value, and SHALL NOT be rendered as a
JSON number. The purpose and counterparty name SHALL be rendered as the stored text, unaltered. The
counterparty account SHALL be rendered as the stored string, or as JSON `null` when the transaction
has none. The person SHALL be rendered as an object holding the referenced person's identity and
current name, and SHALL never be null. The object SHALL NOT carry a currency field and SHALL NOT
carry a direction, type, or flag field about the money movement; the category-assignment provenance
and the referenced category's returned fields are the only values it carries beyond the domain
elements and the storage identity.

#### Scenario: The domain elements are present under their names

- **WHEN** a stored transaction is returned by the endpoint
- **THEN** its object holds `id`, `bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`, `counterpartyAccount`, `person`, `category`, and `categoryAssignment`, and nothing else

#### Scenario: Dates are day-precise

- **WHEN** a transaction stored with booking date 2026-03-02 and value date 2026-03-01 is returned
- **THEN** `bookingDate` reads `2026-03-02` and `valueDate` reads `2026-03-01`, each with no time of day

#### Scenario: The amount keeps its sign and exact value

- **WHEN** a transaction stored with an amount of -42.75 is returned
- **THEN** `amount` reads as the string `-42.75`, with the sign and the fractional part intact and no rounding

#### Scenario: An absent counterparty account is null

- **WHEN** a transaction with no counterparty account is returned
- **THEN** its `counterpartyAccount` reads as JSON `null` rather than as an empty string

#### Scenario: The person is present

- **WHEN** a stored transaction is returned
- **THEN** its `person` field is an object naming the owner, and it is never null

#### Scenario: No currency or direction field is added

- **WHEN** a returned transaction object is inspected
- **THEN** it carries neither a currency field nor a direction, type, or flag field about the money movement, because the amount is denominated in EUR and its sign is the only statement of direction

### Requirement: The endpoint reads and never writes

The system SHALL answer the endpoint with a read of stored data only. The endpoint SHALL NOT create, alter, or delete any row of `transactions`, `categories`, or `people`, SHALL NOT evaluate any category's regular expression, and SHALL NOT assign, remove, or change any category or person. The endpoint SHALL answer a `GET` request and SHALL NOT answer a request whose method creates, alters, or deletes stored data.

#### Scenario: Calling the endpoint changes nothing

- **WHEN** the endpoint is called against a database holding a known set of rows
- **THEN** every row of `transactions`, `categories`, and `people` is exactly as it was, and no category was assigned or evaluated and no person was changed

#### Scenario: A writing method is not answered

- **WHEN** a request using a method that creates, alters, or deletes is made to `/api/transactions`
- **THEN** the endpoint does not act on it, and no row is created, altered, or deleted

## ADDED Requirements

### Requirement: A transaction's person is returned by reference

The transaction object's `person` field SHALL be an object holding exactly `id` and `name`. The `id`
SHALL be the referenced person's identity as a string, and `name` SHALL be the current name read from
`people`. The endpoint SHALL NOT copy the name or return the person's count. The field SHALL follow
the stored reference, so a rename changes the reported name without changing any transaction.

#### Scenario: A person is returned as an id and a name

- **WHEN** a transaction references a person named `Anna`
- **THEN** its `person` field is an object whose `id` is that person's identity and whose `name` is `Anna`, and it carries no other field

#### Scenario: The person name follows the reference

- **WHEN** a person that a returned transaction references is renamed, and the endpoint is called again
- **THEN** the transaction's `person.name` reads the new name, because the name is read from the referenced person rather than copied onto the transaction

#### Scenario: The person's count is not returned

- **WHEN** a transaction is returned
- **THEN** its `person` object holds no transaction count, because the count belongs to the person management surface and not to the transaction

#### Scenario: The person is not the counterparty

- **WHEN** a transaction is returned with both a person and a counterparty name
- **THEN** `person` identifies whose transaction it is and `counterpartyName` identifies the other side, and neither is substituted for the other
