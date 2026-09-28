# Transaction Read API Specification

## Purpose

Defines the read-only HTTP surface that returns stored transactions to a caller: the single endpoint, the JSON shape of a returned transaction, how an uncategorised transaction and the amount are represented, the order results arrive in, and how a database failure is reported without being mistaken for an empty result.

## Requirements

### Requirement: One read-only endpoint returns every stored transaction

The system SHALL expose exactly one endpoint for reading stored transactions, at `/api/transactions`, answered by a `GET` request. The endpoint SHALL return every row of `transactions`, in a single JSON response, and SHALL NOT require a query parameter, a body, or a credential. The response body SHALL be a JSON array of transaction objects, one per stored row. The endpoint SHALL return an empty array with a success status when `transactions` holds no row. The endpoint SHALL NOT offer pagination, filtering, searching, or sorting as options, and SHALL return the whole set on every call.

#### Scenario: Every stored transaction is returned

- **WHEN** `transactions` holds several rows and a `GET` request is made for `/api/transactions`
- **THEN** the response is a JSON array holding one object for each stored row, with a success status

#### Scenario: An empty table is an empty list, not an error

- **WHEN** `transactions` holds no row and a `GET` request is made for `/api/transactions`
- **THEN** the response is a JSON array that is empty, with the same success status as a non-empty read

#### Scenario: No parameter changes the result

- **WHEN** the endpoint is called with no query parameter, with a query parameter, or with a request body
- **THEN** the whole set of stored transactions is returned, because the endpoint defines no parameter that could narrow, page, or order it

### Requirement: A returned transaction carries its seven domain elements

Each transaction object SHALL carry the seven `Transaction` data elements defined by the `transaction-domain-model` capability, together with the row's storage identity. The fields SHALL be named exactly `id`, `bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`, `counterpartyAccount`, and `category`. The `id` field SHALL be the row's storage identity rendered as a string, and is storage metadata rather than an eighth domain element. The two dates SHALL be rendered as calendar dates in `YYYY-MM-DD` form, with no time of day. The amount SHALL be rendered as a decimal string that preserves the stored sign and exact value, and SHALL NOT be rendered as a JSON number. The purpose and counterparty name SHALL be rendered as the stored text, unaltered. The counterparty account SHALL be rendered as the stored string, or as JSON `null` when the transaction has none. The object SHALL NOT carry a currency field and SHALL NOT carry a direction, type, or flag field.

#### Scenario: The domain elements are present under their names

- **WHEN** a stored transaction is returned by the endpoint
- **THEN** its object holds `id`, `bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`, `counterpartyAccount`, and `category`, and no other domain field

#### Scenario: Dates are day-precise

- **WHEN** a transaction stored with booking date 2026-03-02 and value date 2026-03-01 is returned
- **THEN** `bookingDate` reads `2026-03-02` and `valueDate` reads `2026-03-01`, each with no time of day

#### Scenario: The amount keeps its sign and exact value

- **WHEN** a transaction stored with an amount of -42.75 is returned
- **THEN** `amount` reads as the string `-42.75`, with the sign and the fractional part intact and no rounding

#### Scenario: An absent counterparty account is null

- **WHEN** a transaction with no counterparty account is returned
- **THEN** its `counterpartyAccount` reads as JSON `null` rather than as an empty string

#### Scenario: No currency or direction field is added

- **WHEN** a returned transaction object is inspected
- **THEN** it carries neither a currency field nor a direction, type, or flag field, because the amount is denominated in EUR and its sign is the only statement of direction

### Requirement: A transaction's category is returned by reference, and uncategorised reads as null

The transaction object's `category` field SHALL be JSON `null` when the transaction has no
category, and SHALL otherwise be an object holding exactly `id`, `name`, and `hidden`. The category
`id` SHALL be the referenced category's storage identity rendered as a string, `name` SHALL be the
referenced category's current name read from `categories`, and `hidden` SHALL be the referenced
category's current hidden flag read from `categories`, rendered as a JSON boolean. The endpoint
SHALL NOT return a category's regular expression, and SHALL NOT return a placeholder, default, or
sentinel category for an uncategorised transaction. A transaction SHALL carry at most one
category, so `category` SHALL never be a list.

#### Scenario: An uncategorised transaction reads as null

- **WHEN** a transaction whose `category_id` is null is returned
- **THEN** its `category` field reads as JSON `null`, and no category object is invented for it

#### Scenario: A categorised transaction reads as an id and a name

- **WHEN** a transaction whose `category_id` references a category named "Groceries" with hidden `true` is returned
- **THEN** its `category` field is an object whose `id` is that category's identity, whose `name` is `Groceries`, and whose `hidden` is `true`

#### Scenario: The category name follows the reference

- **WHEN** a category that a returned transaction references is renamed, and the endpoint is called again
- **THEN** the transaction's `category.name` reads the new name, because the name is read from the referenced category rather than copied onto the transaction

#### Scenario: The category hidden flag follows the reference

- **WHEN** a category that a returned transaction references is hidden or shown, and the endpoint is called again
- **THEN** the transaction's `category.hidden` reads the new stored value, because the flag is read from the referenced category rather than copied onto the transaction

#### Scenario: The category's expression is not returned

- **WHEN** a categorised transaction is returned
- **THEN** its `category` object holds `id`, `name`, and `hidden` only, and no regular expression

### Requirement: Results are ordered newest booking date first

The endpoint SHALL order the returned transactions by booking date from newest to oldest, and SHALL break ties between transactions sharing a booking date by their storage identity from largest to smallest, so that the order is total and stable across calls. The endpoint SHALL return every matching row regardless of date, and SHALL NOT omit, collapse, or summarise any of them.

#### Scenario: The newest booking date comes first

- **WHEN** transactions with booking dates 2026-03-02, 2026-03-05, and 2026-03-01 are returned
- **THEN** they appear in the order 2026-03-05, 2026-03-02, 2026-03-01

#### Scenario: Equal booking dates have a stable order

- **WHEN** two transactions share a booking date but have different storage identities
- **THEN** the one with the larger identity appears first, and calling the endpoint again produces the same order

#### Scenario: No row is left out by the ordering

- **WHEN** the endpoint returns transactions whose booking dates span a range
- **THEN** every stored transaction appears exactly once, and none is dropped or merged because it shares a date or an amount with another

### Requirement: The endpoint reads and never writes

The system SHALL answer the endpoint with a read of stored data only. The endpoint SHALL NOT create, alter, or delete any row of `transactions` or `categories`, SHALL NOT evaluate any category's regular expression, and SHALL NOT assign, remove, or change any category. The endpoint SHALL answer a `GET` request and SHALL NOT answer a request whose method creates, alters, or deletes stored data.

#### Scenario: Calling the endpoint changes nothing

- **WHEN** the endpoint is called against a database holding a known set of rows
- **THEN** every row of `transactions` and `categories` is exactly as it was, and no category was assigned or evaluated

#### Scenario: A writing method is not answered

- **WHEN** a request using a method that creates, alters, or deletes is made to `/api/transactions`
- **THEN** the endpoint does not act on it, and no row is created, altered, or deleted

### Requirement: A database failure is reported as a failure, not as an empty list

When the database cannot be reached, or no address is configured, the system SHALL report the request as a failure with an error status, and SHALL NOT answer with an empty array or a success status. The error response SHALL NOT contain the database address, a user name, a password, or any part of a connection string. The failure SHALL be confined to this endpoint and SHALL NOT change what the health endpoint reports.

#### Scenario: An unreachable database is an error, not an empty result

- **WHEN** the endpoint is called while the database is unreachable or no address is configured
- **THEN** the response carries an error status and is not an empty transaction array

#### Scenario: No credential is disclosed in the failure

- **WHEN** the endpoint reports a database failure
- **THEN** the response body contains no database address, user name, password, or connection string

#### Scenario: The health endpoint is unaffected

- **WHEN** the endpoint fails because the database is unreachable
- **THEN** the health endpoint still reports the server as up, because it reports on the server alone
