# Spec Delta

## MODIFIED Requirements

### Requirement: The category management surface is the only way a category is written

The system SHALL expose a category management surface under `/api/categories`. A
`GET /api/categories` SHALL return every stored category as a JSON array. A
`POST /api/categories` SHALL create a category from a JSON body naming its name, its regular
expressions, and its date windows. A `PUT /api/categories/:id` SHALL replace the name, the regular
expressions, and the date windows of the category the identity names. A `DELETE /api/categories/:id`
SHALL delete the category the identity names. A `POST /api/categories/:id/patterns` SHALL append one
literal pattern to the category the identity names. The surface SHALL answer JSON in every case,
including its errors. The system SHALL NOT expose any other endpoint that creates, changes, or
deletes a category, and SHALL NOT allow a category's stored elements to be written through the
transactions endpoint: a manual category assignment written there changes a transaction's category
reference and SHALL create, change, or delete no category.

#### Scenario: A category is created

- **WHEN** a `POST /api/categories` request carries a name and either one or more regular expressions or at least one date window that no existing category uses
- **THEN** a category is stored with that name and those expressions and windows and the request is answered with a success status and the created category

#### Scenario: A date-only category is created

- **WHEN** a `POST /api/categories` request carries a name, no regular expression, and a valid window
- **THEN** the category is stored and the request is answered with a success status and the created category

#### Scenario: Every stored category is listed

- **WHEN** `categories` holds several rows and a `GET /api/categories` request is made
- **THEN** the response is a JSON array holding one object for each stored category, with a success status

#### Scenario: A category is edited in place

- **WHEN** a `PUT /api/categories/:id` request names an existing category and carries a new name, expressions, and windows
- **THEN** that category holds the new name, expressions, and windows and the request is answered with a success status

#### Scenario: A category is deleted

- **WHEN** a `DELETE /api/categories/:id` request names an existing category
- **THEN** the category no longer exists and the request is answered with a success status

#### Scenario: A pattern is appended

- **WHEN** a `POST /api/categories/:id/patterns` request carries a text value and names an existing category
- **THEN** one pattern is added to that category and the request is answered with a success status and the updated category

#### Scenario: The transactions endpoint writes no category

- **WHEN** a request that creates, changes, or deletes is made to the transactions endpoint
- **THEN** no category is created, changed, or deleted

### Requirement: An append re-evaluates only the transactions the appended pattern can affect

A `POST /api/categories/:id/patterns` SHALL re-evaluate only the stored transactions the appended
pattern can affect and that are not manually assigned: those whose purpose line or counterparty
name matches the appended literal pattern. Each such transaction SHALL be assigned by the category
assignment rule as part of the append's single operation. Every transaction that does not match the
appended pattern, and every manually assigned transaction, SHALL keep the category it held.

#### Scenario: Matching transactions are re-evaluated

- **WHEN** an append adds a pattern to a category and stored transactions match that pattern
- **THEN** each matching transaction holds the category the category assignment rule selects with the new pattern stored

#### Scenario: A non-matching transaction keeps its category

- **WHEN** an append adds a pattern that matches no part of a stored transaction's purpose line or counterparty name
- **THEN** that transaction's category is unchanged

#### Scenario: A manually assigned matching transaction keeps its category

- **WHEN** an append adds a pattern that matches a manually assigned transaction's purpose line or counterparty name
- **THEN** that transaction keeps the category its manual assignment names

#### Scenario: The outcome equals a full re-evaluation

- **WHEN** an append has been applied
- **THEN** every stored transaction that is not manually assigned holds the category the category assignment rule selects against the stored categories as they now stand, and every manually assigned transaction keeps the category its manual assignment names

#### Scenario: The re-evaluation is atomic with the append

- **WHEN** the re-evaluation of the matching transactions fails
- **THEN** no pattern is stored and no transaction's category changed

### Requirement: Deleting a category reconciles the transactions that referenced it

A delete SHALL remove the named category and SHALL leave no transaction referencing it, because
the schema forbids deleting a category that a transaction references. Before removing the
category, the system SHALL clear every manual assignment that references it, so those transactions
fall back to the assignment rule, and SHALL reassign every transaction that referenced it to the
winning category among the remaining categories for that transaction's purpose line, or to
uncategorised when no remaining category matches, as `category-assignment` defines. The delete
SHALL then remove the category. The system SHALL NOT leave a transaction pointing at a category
that no longer exists, and SHALL NOT delete a transaction.

#### Scenario: A referenced category can be deleted after its transactions are reassigned

- **WHEN** a category that transactions reference is deleted and a remaining category matches those transactions' purpose lines
- **THEN** the transactions are reassigned to the remaining category, the category is deleted, and no transaction references it afterwards

#### Scenario: A delete with no replacement leaves transactions uncategorised

- **WHEN** a category is deleted and no remaining category matches a transaction that referenced it
- **THEN** that transaction is left uncategorised rather than pointing at the deleted category

#### Scenario: A manually assigned transaction loses its manual assignment

- **WHEN** a category that a manually assigned transaction names is deleted
- **THEN** the transaction is assigned among the remaining categories (or left uncategorised) and no longer carries a manual assignment

#### Scenario: Every transaction survives the delete

- **WHEN** a category that several transactions reference is deleted
- **THEN** every one of those transactions still exists and each carries a category that exists or is uncategorised

#### Scenario: An unknown identity is a client error

- **WHEN** a delete or edit request names an identity that no category carries
- **THEN** the request is answered with a client error status and no category is changed or deleted
