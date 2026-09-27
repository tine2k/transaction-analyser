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
expressions. A `PUT /api/categories/:id` SHALL replace the name and the regular expressions of
the category the identity names. A `DELETE /api/categories/:id` SHALL delete the category the
identity names. The surface SHALL answer JSON in every case, including its errors. The system
SHALL NOT expose any other endpoint that creates, changes, or deletes a category, and SHALL NOT
allow a category to be written through the transactions endpoint.

#### Scenario: A category is created

- **WHEN** a `POST /api/categories` request carries a name and one or more regular expressions that no existing category uses
- **THEN** a category is stored with that name and those expressions and the request is answered with a success status and the created category

#### Scenario: Every stored category is listed

- **WHEN** `categories` holds several rows and a `GET /api/categories` request is made
- **THEN** the response is a JSON array holding one object for each stored category, with a success status

#### Scenario: A category is edited in place

- **WHEN** a `PUT /api/categories/:id` request names an existing category and carries a new name and expressions
- **THEN** that category holds the new name and expressions and the request is answered with a success status

#### Scenario: A category is deleted

- **WHEN** a `DELETE /api/categories/:id` request names an existing category
- **THEN** the category no longer exists and the request is answered with a success status

#### Scenario: The transactions endpoint writes no category

- **WHEN** a request that creates, changes, or deletes is made to the transactions endpoint
- **THEN** no category is created, changed, or deleted

### Requirement: The category management surface previews transaction match counts

The category management surface SHALL provide a read-only operation that accepts a non-empty list of candidate regular expressions and returns the number of stored transactions whose purpose line matches at least one expression. Matching SHALL follow `category-assignment`: case-insensitive and against any part of the purpose line. A transaction SHALL be counted once regardless of how many candidate expressions match, and SHALL be counted even if another category currently wins assignment. The operation SHALL validate the expressions using the same rules as category creation and editing, returning a client error for a missing, empty, non-string, or uncompilable expression list. It SHALL NOT create or change a category, assign or reassign a transaction, or otherwise modify stored data. Its successful JSON response SHALL contain the count as an integer. Failures SHALL be reported as errors rather than as a fabricated count.

#### Scenario: A preview returns the number of matching transactions

- **WHEN** a valid non-empty list of candidate expressions is submitted for preview
- **THEN** the response returns the number of stored transactions matching at least one expression

#### Scenario: Matching follows category assignment semantics

- **WHEN** a purpose line contains a match that differs in case or is only a substring match
- **THEN** the transaction is included in the preview count

#### Scenario: Each transaction contributes at most one

- **WHEN** one transaction matches several candidate expressions
- **THEN** it contributes exactly one to the returned count

#### Scenario: A match is counted despite another category winning assignment

- **WHEN** a transaction matches the candidate expressions and also matches a stored category with a smaller identity
- **THEN** the transaction is included in the count for the candidate expressions

#### Scenario: Invalid expressions are refused

- **WHEN** a preview request has no expressions, contains a non-string item, or contains an uncompilable expression
- **THEN** the request receives a client error and no stored data is changed

#### Scenario: Preview leaves category and transaction data unchanged

- **WHEN** a valid preview request is completed
- **THEN** no category or transaction is created, changed, assigned, or deleted

#### Scenario: A database failure is not reported as a count

- **WHEN** the database cannot be reached or no database address is configured
- **THEN** the preview responds with an error and not a success response containing a count

### Requirement: A category carries exactly an identity, a name, and a regular expression

A category returned by the management surface SHALL be a JSON object holding exactly `id`,
`name`, and `patterns`. The `id` SHALL be the storage identity rendered as a string, and is
storage metadata rather than a third domain element. The `name` SHALL be the stored text.
`patterns` SHALL be a JSON array of strings holding every regular expression the category
stores, in the order the expressions were stored. The surface SHALL return the regular
expressions, which the transactions read endpoint does not, because managing a category requires
reading and editing its expressions. The listing SHALL be ordered by identity from smallest to
largest, so the order is total and stable.

#### Scenario: A returned category holds its name and expression

- **WHEN** a category stored with the name "Groceries" and the expressions `rewe` and `edeka` is returned
- **THEN** its object holds `id`, `name` "Groceries", and `patterns` `["rewe","edeka"]`, and no other field

#### Scenario: The expression is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries every one of its expressions in `patterns`, so each expression can be displayed and edited

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

A create or an edit SHALL require a non-empty list of expressions, and SHALL require every
expression in that list to compile as a regular expression. It SHALL reject a request whose list
is absent, is not a list of strings, is empty, or contains an expression that cannot be
compiled, with a client error status and no stored change. The system SHALL NOT store an
expression that the category assignment cannot apply. An empty expression SHALL be accepted as
one element of the list, because it is a well-formed expression, and the category SHALL still
carry at least one expression.

#### Scenario: An uncompilable expression is rejected

- **WHEN** a create or edit request carries a list one of whose expressions no regular expression engine can compile
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: An empty expression is accepted

- **WHEN** a create request carries a non-empty list one of whose expressions is empty
- **THEN** the category is stored, because an empty expression is a well-formed expression

#### Scenario: A missing or empty expression list is rejected

- **WHEN** a create request carries no expressions, or an empty list
- **THEN** the request is rejected with a client error status and no category is created

#### Scenario: An item that is not a string is rejected

- **WHEN** a create or edit request carries a list that holds a value which is not a string
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: Several expressions are stored together

- **WHEN** a create request carries several compilable expressions
- **THEN** the category is stored carrying all of them, and no expression is dropped

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
