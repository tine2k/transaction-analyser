# Spec Delta

## ADDED Requirements

### Requirement: Adding date windows is additive and existing categories carry no window

The system SHALL add date windows to `categories` as an additive extension: a new column holding the category's date windows, non-null, whose default is the empty set, with no change to the name, type, or nullability of the existing `id`, `name`, `patterns`, or `hidden` columns, and no column dropped. Every category that existed before the extension SHALL carry no window afterwards, and SHALL therefore match exactly the purpose lines its expressions matched before. The system SHALL NOT decide any window as part of the extension, and SHALL NOT examine any transaction in order to decide the extension's outcome. No transaction SHALL be re-evaluated by the extension, so no stored category reference changes.

#### Scenario: Existing categories carry no window

- **WHEN** the extension is applied to a database that already holds categories
- **THEN** every one of those rows carries an empty window set and matches exactly the transactions it matched before

#### Scenario: Nothing already stored is rewritten

- **WHEN** the extension is applied
- **THEN** no existing column is renamed, retyped, or made more or less nullable, no existing row is deleted, and no stored name, expression, or hidden flag is altered

#### Scenario: No transaction is reassigned by the extension

- **WHEN** the extension is applied to a database that already holds categorised transactions
- **THEN** every transaction keeps the category it held, because the extension stores windows and does not apply them

## MODIFIED Requirements

### Requirement: One row per category, held in a single table

The system SHALL represent a `Category` as exactly one row in a single PostgreSQL table named
`categories`, holding one column for each of the four `Category` data elements together with a
storage identity. The category's regular expressions SHALL be held together in one column, so a
category carrying several expressions is still exactly one row and no dependent table is
introduced. The category's date windows SHALL likewise be held together in one column, so a
category carrying several windows is still exactly one row. The table SHALL hold no domain element
other than those.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Name | `name` | Required |
| Regular expressions | `patterns` | Required (may be empty when at least one window is present) |
| Hidden flag | `hidden` | Required (non-null, defaults to `false`) |
| Date windows | `windows` | Required (non-null, defaults to no window) |

The `id` column is a storage concern only; it is not a domain element, and the name, the regular
expressions, the hidden flag, and the date windows remain the complete set of domain data. The
system SHALL reject storing a second category under a name that already exists, so that no two
categories are indistinguishable by name. The system SHALL allow a category's name, its regular
expressions, its hidden flag, and its date windows to be changed in place while transactions
reference it, since none is part of any key.

#### Scenario: A category is stored on one row

- **WHEN** a category is stored with a name, several regular expressions, a hidden flag, and several date windows
- **THEN** the name, all of the expressions, the hidden flag, and all of the windows are held on a single row of `categories`, and no other table is read or written to store it

#### Scenario: Category names are distinct

- **WHEN** a category is stored with a name that a category in the table already uses
- **THEN** the write is rejected, and no second row is created under that name

#### Scenario: A category's identity is generated and is not a domain element

- **WHEN** a row is inserted into `categories` without supplying an identity
- **THEN** the database assigns the identity and the row's primary key cannot be left empty, and when the stored category is mapped back to the domain model the identity is storage metadata rather than a fifth domain element

#### Scenario: A referenced category can be renamed or have its expression changed

- **WHEN** a category that transactions reference has its name or its regular expressions changed
- **THEN** the change is accepted, and the referencing transactions still refer to that same category

#### Scenario: A referenced category can be hidden or shown

- **WHEN** a category that transactions reference has its hidden flag changed
- **THEN** the change is accepted, and the referencing transactions still refer to that same category

#### Scenario: A referenced category can have its windows changed

- **WHEN** a category that transactions reference has its date windows changed
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
column. The `windows` column SHALL be a plain non-null column whose default is the empty set,
carrying no constraint that its windows are ordered, well-formed, or non-overlapping: whether two
windows overlap is a business rule the category management surface enforces, not a rule the stored
shape answers. If a business rule is later decided, it SHALL arrive as its own change rather than
being folded into this one.

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
- **THEN** it consists of exactly two tables, `transactions` and `categories`; `transactions` with its eight columns, its primary key, and its one foreign key to `categories`; and `categories` with its five columns and its primary key; and it contains no further table, column, constraint, trigger, function, or derived value
