# Spec Delta

## MODIFIED Requirements

### Requirement: One row per transaction, held in a single table

The system SHALL represent a `Transaction` as exactly one row in a single PostgreSQL table named `transactions`. The table SHALL hold one column for each of the seven `Transaction` data elements, and storing or retrieving a transaction SHALL NOT require reading, joining, or referencing any table other than `categories`. Referencing `categories` SHALL NOT be required either: a transaction SHALL be storable and readable with no `categories` row existing at all.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Booking date | `booking_date` | Required |
| Value date | `value_date` | Required |
| Amount | `amount` | Required |
| Purpose line | `purpose` | Required |
| Counterparty name | `counterparty_name` | Required |
| Counterparty account | `counterparty_account` | Optional |
| Category | `category_id` | Optional (nullable reference to `categories.id`) |

The `id` column is a storage concern only; it is not a domain element, and the seven domain elements remain the complete set of domain data. The `category_id` column holds a reference, not a copy: the category's name and regular expression are not held on the `transactions` row.

#### Scenario: A complete transaction is stored on one row

- **WHEN** a transaction is stored with a booking date, a value date, an amount, a purpose, a counterparty name, a counterparty account, and a category
- **THEN** all eight values are held on a single row of `transactions`, and the only other table involved in reading them is `categories`, consulted for the one row the `category_id` reference names

#### Scenario: A transaction needs no dependent table

- **WHEN** a transaction is stored with a booking date, a value date, an amount, a purpose, and a counterparty name but no counterparty account and no category
- **THEN** the row is written successfully, no account, counterparty, or bank-statement table is required to exist, and no `categories` row is required for the write to succeed or for the row to be read back

#### Scenario: The row is indivisible

- **WHEN** a stored transaction is read
- **THEN** the booking date, value date, amount, purpose, counterparty name, counterparty account, and category reference are read from that one row as a single unit, and are never split across rows; the category's name and regular expression are the one value not held on the row and are obtained by following the reference to the single `categories` row it names

### Requirement: The schema carries no business validation

The system SHALL express only structural guarantees in the schema: column types, presence, the primary key, and referential integrity between `transactions` and `categories`. The system SHALL NOT add a constraint that validates IBAN format or checksum, SHALL NOT add a constraint relating the value date to the booking date, and SHALL NOT add a constraint on the length or content of free text. The system SHALL NOT add a constraint that a category's regular expression is well-formed, that it is non-empty, or that it is capable of matching any purpose line, and SHALL NOT add a column that orders or ranks categories. If a business rule is later decided, it SHALL arrive as its own change rather than being folded into this one.

#### Scenario: An out-of-order pair of dates is accepted

- **WHEN** a transaction is stored whose value date is earlier than its booking date
- **THEN** the write is accepted, because the domain model has not defined a rule about date ordering

#### Scenario: A malformed counterparty account is accepted

- **WHEN** a transaction is stored with a counterparty account that is not a well-formed IBAN
- **THEN** the write is accepted, because IBAN validation has not been decided and remains the responsibility of the code that writes the row

#### Scenario: An unusable regular expression is accepted

- **WHEN** a category is stored whose regular expression is empty, is not a well-formed expression, or matches nothing
- **THEN** the write is accepted, because whether a regular expression is usable is a question for the change that applies it, not a question the stored shape can answer

#### Scenario: No evaluation order is stored

- **WHEN** the `categories` table is inspected
- **THEN** it carries no column expressing the order, precedence, or priority in which categories' regular expressions are to be applied, because no such order has been decided

#### Scenario: No derived or extra data is stored

- **WHEN** the schema is read in full
- **THEN** it consists of exactly two tables, `transactions` and `categories`; `transactions` with its eight columns, its primary key, and its one foreign key to `categories`; and `categories` with its three columns and its primary key; and it contains no further table, column, constraint, trigger, function, or derived value

### Requirement: Every stored transaction has a stable identity

The system SHALL give each row of `transactions` a surrogate identity that the database generates and maintains, and SHALL use it as the row's primary key. The system SHALL NOT require the seven domain elements to be unique, and SHALL NOT add a natural-key unique constraint over them.

#### Scenario: Rows are distinguishable without a domain key

- **WHEN** two transactions are stored that share the same booking date, value date, amount, purpose, and counterparty
- **THEN** both rows are stored successfully and each is addressable by its own distinct surrogate identity

#### Scenario: The identity is generated by the database

- **WHEN** a row is inserted without supplying an identity
- **THEN** the database assigns the identity, and the row's primary key cannot be left empty

#### Scenario: The identity is not a domain element

- **WHEN** a stored transaction is mapped back to the domain model
- **THEN** the surrogate identity is storage metadata and does not appear as an eighth domain data element

## ADDED Requirements

### Requirement: One row per category, held in a single table

The system SHALL represent a `Category` as exactly one row in a single PostgreSQL table named `categories`, holding one column for each of the two `Category` data elements together with a storage identity. The table SHALL hold no domain element other than those.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Name | `name` | Required |
| Regular expression | `pattern` | Required |

The `id` column is a storage concern only; it is not a domain element, and the name and the regular expression remain the complete set of domain data. The system SHALL reject storing a second category under a name that already exists, so that no two categories are indistinguishable by name. The system SHALL allow a category's name and regular expression to be changed in place while transactions reference it, since neither is part of any key.

#### Scenario: A category is stored on one row

- **WHEN** a category is stored with a name and a regular expression
- **THEN** both are held on a single row of `categories`, and no other table is read or written to store it

#### Scenario: Category names are distinct

- **WHEN** a category is stored with a name that a category in the table already uses
- **THEN** the write is rejected, and no second row is created under that name

#### Scenario: A category's identity is generated and is not a domain element

- **WHEN** a row is inserted into `categories` without supplying an identity
- **THEN** the database assigns the identity and the row's primary key cannot be left empty, and when the stored category is mapped back to the domain model the identity is storage metadata rather than a third domain element

#### Scenario: A referenced category can be renamed or have its expression changed

- **WHEN** a category that transactions reference has its name or its regular expression changed
- **THEN** the change is accepted, and the referencing transactions still refer to that same category

### Requirement: A transaction's category is a nullable, referentially enforced reference

The system SHALL hold a transaction's category as a nullable foreign key from `transactions.category_id` to `categories.id`, and SHALL NOT copy the category's name or regular expression onto the `transactions` row. The reference SHALL be null exactly when the transaction is uncategorised. A non-null `category_id` SHALL always name a row that exists in `categories`. The system SHALL NOT allow a category that any transaction references to be deleted, and SHALL NOT cascade that deletion into the referencing transactions, so that a transaction's category can never change without an explicit reassignment.

#### Scenario: An uncategorised transaction is stored with a null reference

- **WHEN** a transaction is stored with no category
- **THEN** the row is accepted with a null `category_id`, and that null reference is what makes the transaction uncategorised

#### Scenario: A reference must name an existing category

- **WHEN** a write sets `category_id` to a value that no row in `categories` carries
- **THEN** the database rejects the write and no row is created

#### Scenario: A referenced category cannot be deleted

- **WHEN** a category that at least one transaction references is deleted
- **THEN** the database rejects the delete, and every transaction that referenced it still references it

#### Scenario: A deletion never silently uncategorises a transaction

- **WHEN** a category is deleted
- **THEN** the delete succeeds if and only if no transaction references it, and no transaction is left pointing at a category that no longer exists or is left uncategorised as a side effect

#### Scenario: The category's details are not duplicated on the transaction row

- **WHEN** a row of `transactions` is inspected
- **THEN** the row carries no category name and no regular expression, only the reference that names the category elsewhere

### Requirement: The category capability is added without altering existing transactions

The system SHALL be extended additively: a new `categories` table and a new nullable `category_id` column on `transactions`, with no change to the name, type, or nullability of any column that already exists, and no column dropped. Every transaction that existed before the extension SHALL hold a null `category_id` afterwards and SHALL therefore read as uncategorised. The system SHALL NOT assign a category to any existing transaction as part of the extension, and SHALL NOT create a category standing for the absence of a category, and SHALL NOT examine any purpose line in order to decide the extension's outcome.

#### Scenario: Existing transactions become uncategorised rather than categorised

- **WHEN** the extension is applied to a database that already holds transactions
- **THEN** every one of those rows carries a null `category_id` and reads as uncategorised

#### Scenario: No transaction is retroactively categorised

- **WHEN** the extension is applied to a database that already holds transactions, some of whose purpose lines would match a category's regular expression
- **THEN** none of those transactions is assigned that category, because the regular expression is stored and not applied by the extension

#### Scenario: Nothing already stored is rewritten

- **WHEN** the extension is applied
- **THEN** no existing column is renamed, retyped, or made more or less nullable, no existing row is deleted or altered, and no data is backfilled
