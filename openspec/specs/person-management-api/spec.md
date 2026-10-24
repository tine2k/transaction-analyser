# person-management-api Specification

## Purpose

Defines the management surface for the named owners of transactions: listing every person with a transaction count, creating a person, renaming one, and refusing deletion and transaction reassignment.

## Requirements

### Requirement: The person management surface is the only way a person is written

The system SHALL expose a person management surface at `/api/people`: a `GET` that lists people, a `POST` that creates one, and a `PUT /api/people/<id>` that renames one. The surface SHALL NOT answer a delete request by removing a person, and SHALL NOT offer an operation that assigns a transaction to a person. A person SHALL be written only through this surface after the migration that bootstraps `Default`.

#### Scenario: The surface lists, creates, and renames

- **WHEN** a `GET`, a `POST`, and a `PUT /api/people/<id>` are made to the surface
- **THEN** the list, create, and rename operations are answered as this capability defines

#### Scenario: No request deletes a person

- **WHEN** a request that would delete a person is made
- **THEN** no person is removed, and the surface offers no deletion operation

#### Scenario: No request assigns a transaction

- **WHEN** a request that would change a transaction's person is made to the surface
- **THEN** no transaction's person is changed, because the surface exposes no such operation

### Requirement: A person is exactly an identity and a name

The system SHALL hold a person as a stable storage identity and a name, and SHALL hold no other data on the person. A response SHALL carry the identity as a string, the name as text, and the number of transactions that reference the person. The transaction count SHALL be derived from the transactions that reference the person rather than stored on the person.

#### Scenario: A person carries an identity, a name, and a count

- **WHEN** a person is returned by the surface
- **THEN** the returned object carries the person's identity, its name, and its transaction count, and no other field

#### Scenario: The count is derived from the references

- **WHEN** a transaction is imported into a person or a person's transaction is read
- **THEN** the person's count reflects the transactions that reference that person, not a stored number on the person row

### Requirement: A person's name is required, trimmed, and distinct ignoring case

The system SHALL require a person's name to be a string that is not empty after surrounding whitespace is stripped, and SHALL store the trimmed name. It SHALL preserve the entered letter case for display. It SHALL reject a create or rename whose name equals another person's name ignoring letter case, and SHALL allow a person to keep its own name while changing only its display case. It SHALL impose no maximum length on a person's name.

#### Scenario: Surrounding whitespace is trimmed

- **WHEN** a person is created with the name `  Anna  `
- **THEN** the stored and returned name is `Anna`

#### Scenario: An empty name is refused

- **WHEN** a person is created or renamed with a name that is empty or only whitespace
- **THEN** the request is refused as an invalid request, and no person is created or changed

#### Scenario: Names are distinct ignoring case

- **WHEN** a person named `Anna` exists and a person is created or renamed to `anna`
- **THEN** the request is refused as a conflict, and no second person is created or changed

#### Scenario: A person may change its own display case

- **WHEN** a person named `Anna` is renamed to `ANNA` and no other person uses that name
- **THEN** the rename succeeds and the display name becomes `ANNA`

#### Scenario: No maximum length is imposed

- **WHEN** a person is created with a long name
- **THEN** the full name is stored and returned, with no length limit applied by the surface

### Requirement: Creating a person creates no transaction

The system SHALL create a person with no transactions, and SHALL answer a successful creation with the created person and a transaction count of zero. Creating a person SHALL NOT create, alter, or delete any transaction, and SHALL NOT create or change any category.

#### Scenario: A new person has no transactions

- **WHEN** a person is created
- **THEN** the creation succeeds and the returned transaction count is zero

#### Scenario: Creation leaves transactions alone

- **WHEN** a person is created while the table holds transactions
- **THEN** no transaction is created, altered, or deleted, and every existing transaction keeps its person

### Requirement: A person's name can be changed in place

The system SHALL rename the person the identity names without changing that person's identity or any transaction's person reference. A successful rename SHALL answer with the renamed person and its transaction count. A rename of an identity that names no person SHALL be refused as a missing resource.

#### Scenario: A rename changes the name and keeps the identity

- **WHEN** an existing person is renamed
- **THEN** the same identity carries the new name, and the person's transaction count is unchanged

#### Scenario: Transactions follow the rename

- **WHEN** a person referenced by transactions is renamed and the transactions are read again
- **THEN** every transaction reads the new person name, because the name is read from the referenced person rather than copied onto the transaction

#### Scenario: An unknown identity is refused

- **WHEN** a rename names an identity that no person carries
- **THEN** the request is refused as a missing resource and no person is changed

### Requirement: Listing people returns every person with a transaction count

The system SHALL answer the list with every stored person, including a person with no transaction, carrying the person's identity, name, and the count of all transactions that reference the person across all time. It SHALL order the people by name ascending, ignoring letter case, with the person identity ascending as the tie-breaker. It SHALL answer an empty list when no person exists, and SHALL report a failure as a failure rather than as an empty list.

#### Scenario: Every person is returned

- **WHEN** several people are stored and the list is requested
- **THEN** one entry is returned for each stored person, with no person dropped

#### Scenario: A person with no transactions is returned

- **WHEN** a person references no transaction and the list is requested
- **THEN** that person is returned with a transaction count of zero

#### Scenario: The count covers every transaction

- **WHEN** a person references transactions in several months and categories
- **THEN** the returned count is the total number of those transactions across all time

#### Scenario: People are ordered by name and identity

- **WHEN** stored names differ in case or are equal ignoring case
- **THEN** the list is ordered case-insensitively by name, with equal names ordered by ascending identity

#### Scenario: An empty list is not an error

- **WHEN** no person is stored and the list is requested
- **THEN** the response is an empty list with a success status

#### Scenario: A failure is not an empty list

- **WHEN** the people cannot be read from the database
- **THEN** the request is reported as a failure and not as an empty people list

### Requirement: A person cannot be deleted

The system SHALL offer no deletion of a person, whether or not any transaction references it. A request that would delete a person SHALL leave every person and every transaction unchanged.

#### Scenario: A person with no transaction is not deletable

- **WHEN** a request that would delete a person with no transaction is made
- **THEN** the person remains, and no deletion is offered

#### Scenario: A referenced person is not deletable

- **WHEN** a request that would delete a person referenced by transactions is made
- **THEN** the person remains, every transaction keeps its person, and no row is removed

### Requirement: A person management failure is reported as a failure and discloses no credential

The system SHALL report an invalid name as a refused request, a duplicate name as a conflict, and an unknown identity as a missing resource. Any other failure SHALL be reported as a server failure with a fixed message. Neither a response nor a log line SHALL contain a database address, a user name, a password, or any part of a connection string.

#### Scenario: An invalid name is a refused request

- **WHEN** a create or rename carries an empty or non-string name
- **THEN** the request is refused with an invalid-request status and no person is written

#### Scenario: A duplicate name is a conflict

- **WHEN** a create or rename would use a name that another person already uses ignoring case
- **THEN** the request is refused with a conflict status and the other person is unchanged

#### Scenario: An unknown identity is a missing resource

- **WHEN** a rename names an identity that no person carries
- **THEN** the request is refused with a missing-resource status

#### Scenario: A server failure is fixed and discloses nothing

- **WHEN** the people cannot be read or written for a reason other than the request's content
- **THEN** the response carries a fixed server-failure message, and neither the response nor the log line carries a credential or connection string
