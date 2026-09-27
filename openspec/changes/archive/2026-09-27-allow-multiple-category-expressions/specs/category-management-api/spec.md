# Spec Delta

## MODIFIED Requirements

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
