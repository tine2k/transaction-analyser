# Spec Delta

## MODIFIED Requirements

### Requirement: One row per category, held in a single table

The system SHALL represent a `Category` as exactly one row in a single PostgreSQL table named
`categories`, holding one column for each of the three `Category` data elements together with a
storage identity. The category's regular expressions SHALL be held together in one column, so a
category carrying several expressions is still exactly one row and no dependent table is
introduced. The table SHALL hold no domain element other than those.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Name | `name` | Required |
| Regular expressions | `patterns` | Required |
| Hidden flag | `hidden` | Required (non-null, defaults to `false`) |

The `id` column is a storage concern only; it is not a domain element, and the name, the regular
expressions, and the hidden flag remain the complete set of domain data. The system SHALL reject
storing a second category under a name that already exists, so that no two categories are
indistinguishable by name. The system SHALL allow a category's name, its regular expressions, and
its hidden flag to be changed in place while transactions reference it, since none is part of any
key.

#### Scenario: A category is stored on one row

- **WHEN** a category is stored with a name, several regular expressions, and a hidden flag
- **THEN** the name, all of the expressions, and the hidden flag are held on a single row of `categories`, and no other table is read or written to store it

#### Scenario: Category names are distinct

- **WHEN** a category is stored with a name that a category in the table already uses
- **THEN** the write is rejected, and no second row is created under that name

#### Scenario: A category's identity is generated and is not a domain element

- **WHEN** a row is inserted into `categories` without supplying an identity
- **THEN** the database assigns the identity and the row's primary key cannot be left empty, and when the stored category is mapped back to the domain model the identity is storage metadata rather than a fourth domain element

#### Scenario: A referenced category can be renamed or have its expression changed

- **WHEN** a category that transactions reference has its name, its regular expressions, or its hidden flag changed
- **THEN** the change is accepted, and the referencing transactions still refer to that same category

### Requirement: The schema carries no business validation

The system SHALL express only structural guarantees in the schema: column types, presence, the
primary key, and referential integrity between `transactions` and `categories`. The system SHALL
NOT add a constraint that validates IBAN format or checksum, SHALL NOT add a constraint relating
the value date to the booking date, and SHALL NOT add a constraint on the length or content of
free text. The system SHALL NOT add a constraint that a category's regular expression is
well-formed, that it is non-empty, or that it is capable of matching any purpose line, and SHALL
NOT add a column that orders or ranks categories. The `hidden` column SHALL be a plain non-null
boolean with a default, carrying no constraint that relates it to transactions or to any other
column. If a business rule is later decided, it SHALL arrive as its own change rather than being
folded into this one.

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
- **THEN** it consists of exactly two tables, `transactions` and `categories`; `transactions` with its eight columns, its primary key, and its one foreign key to `categories`; and `categories` with its four columns and its primary key; and it contains no further table, column, constraint, trigger, function, or derived value

## ADDED Requirements

### Requirement: Adding the hidden flag is additive and existing categories read as visible

The system SHALL add the `hidden` flag to `categories` as an additive extension: a new non-null
boolean column whose default is `false`, with no change to the name, type, or nullability of the
existing `id`, `name`, or `patterns` columns, and no column dropped. Every category that existed
before the extension SHALL read as not hidden afterwards. The system SHALL NOT decide any
category's visibility as part of the extension, and SHALL NOT examine any category's expressions
or any transaction in order to decide the extension's outcome.

#### Scenario: Existing categories become visible rather than hidden

- **WHEN** the extension is applied to a database that already holds categories
- **THEN** every one of those rows carries `hidden` as `false` and reads as visible

#### Scenario: Nothing already stored is rewritten

- **WHEN** the extension is applied
- **THEN** no existing column is renamed, retyped, or made more or less nullable, no existing row is deleted, and no stored name or expression is altered

#### Scenario: No category's visibility is decided by the extension

- **WHEN** the extension is applied to a database that already holds categories whose purpose lines match existing expressions
- **THEN** no category is hidden by the extension, because visibility is stored and not derived
