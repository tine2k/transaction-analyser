# Spec Delta

## MODIFIED Requirements

### Requirement: A returned transaction carries its seven domain elements

Each transaction object SHALL carry the seven `Transaction` data elements defined by the `transaction-domain-model` capability, together with the row's storage identity. The fields SHALL be named exactly `id`, `bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`, `counterpartyAccount`, and `category`. The `id` field SHALL be the row's storage identity rendered as a string, and is storage metadata rather than an eighth domain element. The two dates SHALL be rendered as calendar dates in `YYYY-MM-DD` form, with no time of day. The amount SHALL be rendered as a decimal string that preserves the stored sign and exact value, and SHALL NOT be rendered as a JSON number. The purpose and counterparty name SHALL be rendered as the stored text, unaltered. The counterparty account SHALL be rendered as the stored string, or as JSON `null` when the transaction has none. The object SHALL NOT carry a currency field and SHALL NOT carry a direction, type, or flag field about the money movement; the category-assignment provenance is the only field it carries beyond the domain elements and the storage identity.

#### Scenario: The domain elements are present under their names

- **WHEN** a stored transaction is returned by the endpoint
- **THEN** its object holds `id`, `bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`, `counterpartyAccount`, `category`, and `categoryAssignment`, and nothing else

#### Scenario: Dates are day-precise

- **WHEN** a transaction stored with booking date 2026-03-02 and value date 2026-03-01 is returned
- **THEN** `bookingDate` reads `2026-03-02` and `valueDate` reads `2026-03-01`, each with no time of day

#### Scenario: The amount keeps its sign and exact value

- **WHEN** a transaction stored with an amount of -42.75 is returned
- **THEN** `amount` reads as the string `-42.75`, with the sign and the fractional part intact and no rounding

#### Scenario: An absent counterparty account is null

- **WHEN** a transaction with no counterparty account is returned
- **THEN** its `counterpartyAccount` reads as JSON `null` rather than as an empty string

#### Scenario: No currency or direction field is added

- **WHEN** a returned transaction object is inspected
- **THEN** it carries neither a currency field nor a direction, type, or flag field about the money movement, because the amount is denominated in EUR and its sign is the only statement of direction

## ADDED Requirements

### Requirement: The returned transaction reports whether its category is manual or rule-derived

Each transaction object SHALL carry the field `categoryAssignment`, rendered as `manual` when the transaction's category is manually assigned and as `automatic` when the category is the one the matching rule selects. An uncategorised transaction SHALL read as `automatic`. The field SHALL follow the stored assignment and SHALL NOT change any other returned value.

#### Scenario: A manually assigned transaction reads as manual

- **WHEN** a transaction's category assignment is manual
- **THEN** its `categoryAssignment` reads `manual`

#### Scenario: A rule-derived transaction reads as automatic

- **WHEN** a transaction's category is the one the matching rule selects
- **THEN** its `categoryAssignment` reads `automatic`

#### Scenario: An uncategorised transaction reads as automatic

- **WHEN** a transaction has no category
- **THEN** its `categoryAssignment` reads `automatic`, and no manual assignment is invented for it

#### Scenario: The provenance follows the stored assignment

- **WHEN** a manually assigned transaction's manual assignment is cleared, and the endpoint is called again
- **THEN** its `categoryAssignment` reads `automatic`
