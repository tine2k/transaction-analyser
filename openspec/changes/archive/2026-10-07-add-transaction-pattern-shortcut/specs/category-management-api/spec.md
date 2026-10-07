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
deletes a category, and SHALL NOT allow a category to be written through the transactions endpoint.

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

## ADDED Requirements

### Requirement: The category management surface appends a literal pattern

A `POST /api/categories/:id/patterns` SHALL append one pattern to the category the identity names,
built from the trimmed `text` value so it matches that text literally. The append SHALL leave the
name, other patterns, hidden flag, and date windows unchanged, SHALL store the new pattern after the
existing ones, and SHALL answer with the updated category and a flag stating whether a pattern was
added.

#### Scenario: A literal pattern is appended

- **WHEN** an append names an existing category and carries text
- **THEN** one pattern matching that text literally is added after the category's existing patterns and the response carries the updated category

#### Scenario: A metacharacter in the text matches literally

- **WHEN** the text contains a regular-expression metacharacter
- **THEN** the stored pattern matches that character literally rather than treating it as an operator

#### Scenario: The append leaves the rest of the category unchanged

- **WHEN** a category that carries date windows, a hidden flag, and existing patterns receives an append
- **THEN** its name, hidden flag, windows, and existing patterns are unchanged

#### Scenario: Transactions are re-evaluated with the append

- **WHEN** an appended pattern matches stored transactions
- **THEN** those transactions are assigned a category by the category assignment rule as part of the same operation

#### Scenario: Concurrent appends do not lose a pattern

- **WHEN** two appends to the same category run concurrently
- **THEN** both patterns are stored and neither append overwrites the other

#### Scenario: An unknown identity is a client error

- **WHEN** an append names an identity that no category carries
- **THEN** the request is refused with a client error status and no pattern is stored

### Requirement: An append requires text of at least three characters

An append SHALL require a `text` value that is a string whose trimmed length is at least three
characters. A request whose `text` is missing, is not a string, or is shorter than three characters
after trimming SHALL be rejected with a client error status and no stored change.

#### Scenario: A short text is refused

- **WHEN** an append carries a text whose trimmed form is shorter than three characters
- **THEN** the request is rejected with a client error status and no pattern is stored

#### Scenario: A non-string text is refused

- **WHEN** an append carries a `text` value that is not a string
- **THEN** the request is rejected with a client error status and no pattern is stored

#### Scenario: A missing text is refused

- **WHEN** an append carries no `text` value
- **THEN** the request is rejected with a client error status and no pattern is stored

#### Scenario: Surrounding whitespace does not count toward the length

- **WHEN** an append carries text whose trimmed form is at least three characters
- **THEN** the request is accepted and the stored pattern is built from the trimmed text

### Requirement: Appending a pattern the category already stores changes nothing

When the pattern built from the text is already one of the category's stored patterns, the append
SHALL store no change, SHALL answer with a flag stating that no pattern was added, and SHALL leave
every transaction's category unchanged.

#### Scenario: An already-stored pattern is a no-op

- **WHEN** the pattern built from the text already exists among the category's patterns
- **THEN** the stored category is unchanged and the response states that no pattern was added

#### Scenario: A duplicate append changes no transaction

- **WHEN** an append reports that no pattern was added
- **THEN** no transaction's category changes as a result of the request

### Requirement: The category management surface previews the transactions a literal text matches

The category management surface SHALL provide a read-only operation that accepts a `text` value and
returns the number of stored transactions whose purpose line contains it, matched case-insensitively
and literally. It SHALL validate the text as an append does, count each transaction once, change no
category or transaction, and answer with the count as an integer. A failure SHALL be reported as an
error rather than as a fabricated count.

#### Scenario: A preview returns the number of matching transactions

- **WHEN** a valid text is submitted for preview
- **THEN** the response returns the number of stored transactions whose purpose line contains that text

#### Scenario: Matching is case-insensitive

- **WHEN** a purpose line contains the text with a different letter case
- **THEN** the transaction is counted

#### Scenario: A metacharacter in the text matches literally

- **WHEN** the text contains a regular-expression metacharacter
- **THEN** only transactions whose purpose line contains that literal character are counted

#### Scenario: Each transaction contributes at most one

- **WHEN** one transaction's purpose line contains the text more than once
- **THEN** it contributes exactly one to the returned count

#### Scenario: An invalid text is refused

- **WHEN** a preview request has no text, carries a non-string text, or carries a text shorter than three characters after trimming
- **THEN** the request receives a client error and no stored data is changed

#### Scenario: Preview leaves category and transaction data unchanged

- **WHEN** a valid preview request is completed
- **THEN** no category or transaction is created, changed, assigned, or deleted

#### Scenario: A database failure is not reported as a count

- **WHEN** the database cannot be reached or no database address is configured
- **THEN** the preview responds with an error and not a success response containing a count
