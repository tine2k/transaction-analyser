# Spec Delta

## MODIFIED Requirements

### Requirement: One row per transaction, held in a single table

The system SHALL represent a `Transaction` as exactly one row in a single PostgreSQL table named `transactions`. The table SHALL hold one column for each of the eight `Transaction` data elements, and storing or retrieving a transaction SHALL NOT require reading, joining, or referencing any table other than `categories` and `people`. Referencing `categories` SHALL NOT be required: a transaction SHALL be storable and readable with no `categories` row existing at all. Referencing `people` SHALL be required: every transaction SHALL name a stored person.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Booking date | `booking_date` | Required |
| Value date | `value_date` | Required |
| Amount | `amount` | Required |
| Purpose line | `purpose` | Required |
| Counterparty name | `counterparty_name` | Required |
| Counterparty account | `counterparty_account` | Optional |
| Person | `person_id` | Required (reference to `people.id`) |
| Category | `category_id` | Optional (nullable reference to `categories.id`) |

The `id` column is a storage concern only; it is not a domain element, and the eight domain elements remain the complete set of domain data. The `category_id` and `person_id` columns hold references, not copies: neither the category's name and regular expression nor the person's name are held on the `transactions` row.

#### Scenario: A complete transaction is stored on one row

- **WHEN** a transaction is stored with a booking date, a value date, an amount, a purpose, a counterparty name, a counterparty account, a person, and a category
- **THEN** all nine values are held on a single row of `transactions`, and the only other tables involved in reading them are `categories` and `people`, consulted for the rows the two references name

#### Scenario: A transaction needs no dependent table

- **WHEN** a transaction is stored with a booking date, a value date, an amount, a purpose, a counterparty name, and a person, but no counterparty account and no category
- **THEN** the row is written successfully, no account, counterparty, or bank-statement table is required to exist, no `categories` row is required, and the named `people` row is the one required reference

#### Scenario: The row is indivisible

- **WHEN** a stored transaction is read
- **THEN** the booking date, value date, amount, purpose, counterparty name, counterparty account, person reference, and category reference are read from that one row as a single unit, and are never split across rows; the person's name and the category's name and regular expression are obtained by following the references to the single rows they name

#### Scenario: The references are not copies

- **WHEN** a row of `transactions` is inspected
- **THEN** it carries no person name and no category name or regular expression, only the two references that name those rows elsewhere

### Requirement: Required elements are rejected when absent

The system SHALL reject a write that omits any of the six required elements — booking date, value date, amount, purpose, counterparty name, person — and SHALL accept a row with no counterparty account. The table SHALL reject a row whose amount is zero.

#### Scenario: A row missing a required element is rejected

- **WHEN** a write omits the value date, the amount, the purpose, the counterparty name, or the person
- **THEN** the database rejects the write and no row is created

#### Scenario: A missing person is rejected

- **WHEN** a write stores a transaction with no `person_id`
- **THEN** the database rejects the write, because every transaction has an owner

#### Scenario: A missing counterparty account is accepted

- **WHEN** a cash withdrawal is stored with a counterparty name, a person, and no counterparty account
- **THEN** the row is accepted and the counterparty account reads as absent rather than as an empty identifier

#### Scenario: A zero amount is rejected

- **WHEN** a write sets the amount to 0.00
- **THEN** the database rejects the write, because a zero amount carries no direction and therefore cannot express the domain's signed-amount convention

#### Scenario: Presence is not emptiness

- **WHEN** a row is written with a purpose that is the empty string
- **THEN** the write is accepted, since a required element means the value is present, not that it is non-empty

### Requirement: Every stored transaction has a stable identity

The system SHALL give each row of `transactions` a surrogate identity that the database generates and maintains, and SHALL use it as the row's primary key. The system SHALL NOT require the eight domain elements to be unique, and SHALL NOT add a natural-key unique constraint over them.

#### Scenario: Rows are distinguishable without a domain key

- **WHEN** two transactions are stored that share the same booking date, value date, amount, purpose, counterparty, and person
- **THEN** both rows are stored successfully and each is addressable by its own distinct surrogate identity

#### Scenario: The identity is generated by the database

- **WHEN** a row is inserted without supplying an identity
- **THEN** the database assigns the identity, and the row's primary key cannot be left empty

#### Scenario: The identity is not a domain element

- **WHEN** a stored transaction is mapped back to the domain model
- **THEN** the surrogate identity is storage metadata and does not appear as a ninth domain data element

### Requirement: The schema carries no business validation

The system SHALL express only structural guarantees in the schema: column types, presence, the
primary key, and referential integrity between `transactions` and `categories`, between
`transactions` and `people`, and between `import_runs` and `people`. The system SHALL NOT add a
constraint that validates IBAN format or checksum, SHALL NOT add a constraint relating the value
date to the booking date, and SHALL NOT add a constraint on the length or content of free text. A
person's name SHALL be distinct from every other person's name ignoring letter case as a structural
identity rule, and no constraint SHALL validate the name's spelling or length. The system SHALL NOT
add a constraint that a category's regular expression is well-formed, that it is non-empty, or that
it is capable of matching any purpose line, and SHALL NOT add a column that orders or ranks
categories. The `hidden` column SHALL be a plain non-null boolean with a default, carrying no
constraint that relates it to transactions or to any other column. The `windows` column SHALL be a
plain non-null column whose default is the empty set, carrying no constraint that its windows are
ordered, well-formed, or non-overlapping: whether two windows overlap is a business rule the
category management surface enforces, not a rule the stored shape answers. The `expense_type` column
SHALL be a plain nullable column holding `recurring` or `one-time` when set and nothing when unset,
carrying no constraint that relates it to transactions, expressions, windows, or any other column.
If a business rule is later decided, it SHALL arrive as its own change rather than being folded into
this one.

#### Scenario: An out-of-order pair of dates is accepted

- **WHEN** a transaction is stored whose value date is earlier than its booking date
- **THEN** the write is accepted, because the domain model has not defined a rule about date ordering

#### Scenario: A malformed counterparty account is accepted

- **WHEN** a transaction is stored with a counterparty account that is not a well-formed IBAN
- **THEN** the write is accepted, because IBAN validation has not been decided and remains the responsibility of the code that writes the row

#### Scenario: An unusable regular expression is accepted

- **WHEN** a category is stored whose regular expression is empty, is not a well-formed expression, or matches nothing
- **THEN** the write is accepted, because whether a regular expression is usable is a question for the change that applies it, not a question the stored shape can answer

#### Scenario: Overlapping windows are accepted by the schema

- **WHEN** a category is stored carrying date windows that overlap each other or another category's windows
- **THEN** the write is accepted, because the schema holds the windows as data and leaves the non-overlap rule to the category management surface

#### Scenario: No evaluation order is stored

- **WHEN** the `categories` table is inspected
- **THEN** it carries no column expressing the order, precedence, or priority in which categories' regular expressions or date windows are to be applied, because no such order has been decided

#### Scenario: No derived or extra data is stored

- **WHEN** the schema is read in full
- **THEN** it consists of the tables the capabilities define — `transactions`, `categories`, `people`, and `import_runs` — with the columns and references those capabilities define, and it contains no further table, column, constraint, trigger, function, or derived value beyond them

## ADDED Requirements

### Requirement: One row per person, held in a single table

The system SHALL represent a person as exactly one row in a PostgreSQL table named `people`, holding
a generated primary key and a name and no other data. The name SHALL be required text with no length
limit and SHALL be distinct from every other person's name ignoring case. It SHALL be changeable in
place while transactions and import runs reference the person, because the name is not part of any
key.

#### Scenario: A person is stored on one row

- **WHEN** a person is stored with a name
- **THEN** the identity and the name are held on one row of `people`, and no other table is read or written to store the person

#### Scenario: Person names are distinct ignoring case

- **WHEN** a person is stored with a name that another person uses, differing only in letter case
- **THEN** the write is rejected, and no second row is created under that name ignoring case

#### Scenario: A person's identity is generated and is not domain data

- **WHEN** a row is inserted into `people` without supplying an identity
- **THEN** the database assigns the identity, the primary key cannot be left empty, and the identity is storage metadata rather than part of the person's name

#### Scenario: A referenced person can be renamed

- **WHEN** a person referenced by transactions has its name changed
- **THEN** the change is accepted and every referencing transaction still references that same person

#### Scenario: The person carries no stored count

- **WHEN** a row of `people` is inspected
- **THEN** it carries an identity and a name and no stored transaction count, because the count is derived from the transactions that reference the person

### Requirement: A transaction's person is a required, referentially enforced reference

The system SHALL hold a transaction's person as a non-null foreign key from `transactions.person_id`
to `people.id`, and SHALL NOT copy the person's name onto the `transactions` row. A non-null
`person_id` SHALL always name a row that exists in `people`. The system SHALL NOT allow a person that
any transaction references to be deleted, and SHALL NOT cascade that deletion into the referencing
transactions, so that a transaction's owner can never change without an explicit reassignment.

#### Scenario: A transaction always names a person

- **WHEN** a transaction is stored
- **THEN** its `person_id` is present and names a stored person, and a null or unknown reference is rejected

#### Scenario: A reference must name an existing person

- **WHEN** a write sets `person_id` to a value that no row in `people` carries
- **THEN** the database rejects the write and no row is created

#### Scenario: A referenced person cannot be deleted

- **WHEN** a person that at least one transaction references is deleted
- **THEN** the database rejects the delete, and every transaction that referenced it still references it

#### Scenario: The person's name is not duplicated on the transaction row

- **WHEN** a row of `transactions` is inspected
- **THEN** the row carries no person name, only the reference that names the person elsewhere

### Requirement: The person extension assigns every existing transaction to Default

The system SHALL create `people`, insert `Default`, add nullable `transactions.person_id`, assign
every existing transaction to `Default`, then make it non-null. `Default` SHALL exist even when no
transaction does. The extension SHALL add nullable `import_runs.person_id`, leave existing runs
unset, change no other transaction value, and not derive a person from transaction data.

#### Scenario: Every existing transaction becomes Default

- **WHEN** the extension is applied to a database that already holds transactions
- **THEN** every one of those rows references the same `Default` person and reads as owned by `Default`

#### Scenario: An empty database still gets Default

- **WHEN** the extension is applied to a database that holds no transaction
- **THEN** the `Default` person exists with a transaction count of zero, so a later import can name it

#### Scenario: Nothing else on a transaction is rewritten

- **WHEN** the extension is applied
- **THEN** no existing column is renamed, retyped, or dropped, and no booking date, value date, amount, purpose, counterparty, category, or category lock changes

#### Scenario: The person is not inferred from transaction data

- **WHEN** the extension is applied to transactions from a bank statement
- **THEN** every row receives `Default` regardless of its purpose, counterparty, account, or date, because no transaction value decides the person

#### Scenario: Existing import runs keep no person

- **WHEN** the extension is applied to a database that already holds import runs
- **THEN** every pre-existing run's person is unset, and no run is retroactively assigned to `Default`

### Requirement: The import run's person is a nullable, referentially enforced reference

The system SHALL hold an import run's person as a nullable foreign key from `import_runs.person_id`
to `people.id`. When set, the reference SHALL name a row that exists in `people`; when absent, the run
SHALL read as not recorded against a person. A run recorded before the extension, or a run that never
resolved a person, SHALL carry no person. The system SHALL NOT backfill an existing run's person and
SHALL NOT cascade a person's deletion into the run records.

#### Scenario: A new run can name a person

- **WHEN** an import run is recorded with a person
- **THEN** the run's `person_id` names that stored person, and the run reads as recorded against it

#### Scenario: A run can have no person

- **WHEN** a run is recorded before the extension or without a resolved person
- **THEN** its `person_id` is null and it reads as not recorded against a person

#### Scenario: An unknown person is rejected

- **WHEN** a run is recorded with a `person_id` that no row in `people` carries
- **THEN** the database rejects the write and no run is created

#### Scenario: Existing runs are not backfilled

- **WHEN** the extension is applied to a database that already holds import runs
- **THEN** those runs keep a null person, and only runs recorded after the extension can name one
