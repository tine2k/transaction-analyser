# Category Management API Specification

## Purpose

Defines the HTTP surface through which categories are listed, created, edited, and deleted:
the endpoint set, the JSON shape of a category, the validation each request is held to, and how
deleting a category reconciles the transactions that referenced it. It complements
`transaction-read-api`, which stays read-only, and `category-assignment`, which owns the
matching rules a successful write triggers.

## Requirements

### Requirement: The category management surface is the only way a category is written

The system SHALL expose a category management surface under `/api/categories`. A
`GET /api/categories` SHALL return every stored category as a JSON array. A
`POST /api/categories` SHALL create a category from a JSON body naming its name and its regular
expression. A `PUT /api/categories/:id` SHALL replace the name and the regular expression of the
category the identity names. A `DELETE /api/categories/:id` SHALL delete the category the
identity names. The surface SHALL answer JSON in every case, including its errors. The system
SHALL NOT expose any other endpoint that creates, changes, or deletes a category, and SHALL NOT
allow a category to be written through the transactions endpoint.

#### Scenario: A category is created

- **WHEN** a `POST /api/categories` request carries a name and a regular expression that no existing category uses
- **THEN** a category is stored with that name and expression and the request is answered with a success status and the created category

#### Scenario: Every stored category is listed

- **WHEN** `categories` holds several rows and a `GET /api/categories` request is made
- **THEN** the response is a JSON array holding one object for each stored category, with a success status

#### Scenario: A category is edited in place

- **WHEN** a `PUT /api/categories/:id` request names an existing category and carries a new name and expression
- **THEN** that category holds the new name and expression and the request is answered with a success status

#### Scenario: A category is deleted

- **WHEN** a `DELETE /api/categories/:id` request names an existing category
- **THEN** the category no longer exists and the request is answered with a success status

#### Scenario: The transactions endpoint writes no category

- **WHEN** a request that creates, changes, or deletes is made to the transactions endpoint
- **THEN** no category is created, changed, or deleted

### Requirement: A category carries exactly an identity, a name, and a regular expression

A category returned by the management surface SHALL be a JSON object holding exactly `id`,
`name`, and `pattern`. The `id` SHALL be the storage identity rendered as a string, and is
storage metadata rather than a third domain element. The `name` and `pattern` SHALL be the
stored text. The surface SHALL return the regular expression, which the transactions read
endpoint does not, because managing a category requires reading and editing its expression. The
listing SHALL be ordered by identity from smallest to largest, so the order is total and stable.

#### Scenario: A returned category holds its name and expression

- **WHEN** a category stored with the name "Groceries" and the pattern `(?i)rewe|edeka` is returned
- **THEN** its object holds `id`, `name` "Groceries", and `pattern` `(?i)rewe|edeka`, and no other field

#### Scenario: The expression is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries its `pattern`, so the expression can be displayed and edited

#### Scenario: The listing has a stable order

- **WHEN** the listing is returned twice against the same stored categories
- **THEN** the categories appear in the same order, sorted by identity from smallest to largest

### Requirement: A category's name is required and category names are distinct

A create or an edit SHALL require a present, non-empty name, and SHALL reject a name that is
already used by a different category. A rejected request SHALL be answered with a client error
status and SHALL leave the stored categories unchanged.

#### Scenario: A missing name is rejected

- **WHEN** a create request carries no name, or a name that is empty or blank
- **THEN** the request is rejected with a client error status and no category is created

#### Scenario: A duplicate name is rejected

- **WHEN** a create or edit request carries a name that another category already uses
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: A category may keep its own name when edited

- **WHEN** an edit request carries the same name the category already holds
- **THEN** the request is accepted

### Requirement: A regular expression must be compilable before it is stored

A create or an edit SHALL require a pattern that compiles as a regular expression, and SHALL
reject a pattern that cannot be compiled, with a client error status and no stored change. The
system SHALL NOT store a pattern that the category assignment cannot apply. An empty pattern
SHALL be accepted, because it is a well-formed expression.

#### Scenario: An uncompilable expression is rejected

- **WHEN** a create or edit request carries a pattern that no regular expression engine can compile
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: An empty expression is accepted

- **WHEN** a create request carries an empty pattern
- **THEN** the category is stored, because an empty pattern is a well-formed expression

### Requirement: Deleting a category reconciles the transactions that referenced it

A delete SHALL remove the named category and SHALL leave no transaction referencing it, because
the schema forbids deleting a category that a transaction references. Before removing the
category, the system SHALL reassign every transaction that referenced it to the winning category
among the remaining categories for that transaction's purpose line, or to uncategorised when no
remaining category matches, as `category-assignment` defines. The delete SHALL then remove the
category. The system SHALL NOT leave a transaction pointing at a category that no longer exists,
and SHALL NOT delete a transaction.

#### Scenario: A referenced category can be deleted after its transactions are reassigned

- **WHEN** a category that transactions reference is deleted and a remaining category matches those transactions' purpose lines
- **THEN** the transactions are reassigned to the remaining category, the category is deleted, and no transaction references it afterwards

#### Scenario: A delete with no replacement leaves transactions uncategorised

- **WHEN** a category is deleted and no remaining category matches a transaction that referenced it
- **THEN** that transaction is left uncategorised rather than pointing at the deleted category

#### Scenario: Every transaction survives the delete

- **WHEN** a category that several transactions reference is deleted
- **THEN** every one of those transactions still exists and each carries a category that exists or is uncategorised

#### Scenario: An unknown identity is a client error

- **WHEN** a delete or edit request names an identity that no category carries
- **THEN** the request is answered with a client error status and no category is changed or deleted

### Requirement: A category management failure is reported as a failure and discloses no credential

When the database cannot be reached or no address is configured, the surface SHALL answer with
an error status and SHALL NOT answer with a success status, an empty list, or a claim that the
write succeeded. No response body and no log line SHALL contain the database address, a user
name, a password, or any part of a connection string.

#### Scenario: An unreachable database is an error, not an empty list

- **WHEN** the category surface is called while the database is unreachable or no address is configured
- **THEN** the response carries an error status rather than an empty category array or a success

#### Scenario: No credential is disclosed

- **WHEN** a category request reports a database failure
- **THEN** the response body and the log line contain no database address, user name, password, or connection string
