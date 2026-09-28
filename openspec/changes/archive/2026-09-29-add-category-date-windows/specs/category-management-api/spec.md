# Spec Delta

## ADDED Requirements

### Requirement: A category's date windows are accepted on create and edit

A create and an edit SHALL accept a `windows` value in their JSON body. When `windows` is absent it
SHALL be treated as no windows, because create and edit replace the stored category. When present
it SHALL be a JSON array whose every element is a JSON object holding exactly `from` and `to`;
`from` and `to` SHALL each be a string holding a full calendar date in `YYYY-MM-DD` form with no
time of day. A request whose `windows` is not an array, whose element is not an object, whose
`from` or `to` is missing, is not a string, or is not a well-formed full date, or whose `from` is
later than its `to`, SHALL be rejected with a client error status and no stored change. The
windows SHALL be stored in the order given, and the returned category SHALL carry them in that
order.

#### Scenario: Windows are accepted and stored in order

- **WHEN** a create request carries two windows and the second is 2026-08-01 to 2026-08-14
- **THEN** the category is stored and returned carrying both windows in the order given

#### Scenario: An omitted window list means no window

- **WHEN** a create or edit request carries no `windows` value
- **THEN** the stored and returned category carries an empty window list

#### Scenario: A window that is not an object is rejected

- **WHEN** a create or edit request carries `windows` whose element is not a JSON object
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: A malformed window date is rejected

- **WHEN** a create or edit request carries a window whose `from` is missing, is not a string, or is not a full `YYYY-MM-DD` date
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: A window with an impossible date is rejected

- **WHEN** a create or edit request carries a window whose `from` reads `2026-02-30`
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: A window whose from is after its to is rejected

- **WHEN** a create or edit request carries a window from 2026-07-14 to 2026-07-01
- **THEN** the request is rejected with a client error status and no category is created or changed

### Requirement: Date windows may not overlap any stored window

A create or an edit SHALL reject a candidate window set in which two windows overlap, or in which
a window overlaps any stored window of another category, with a client error status and no stored
change. Two windows overlap when the days they cover intersect, each window inclusive of both
endpoints, so a shared endpoint day counts as an overlap. Because an edit replaces a category's
windows, the category's own stored windows SHALL NOT be treated as foreign and SHALL NOT by
themselves cause a rejection; the candidate set is checked against itself and against every other
category's stored windows. A rejected request SHALL leave every stored category, expression,
window, and transaction unchanged.

#### Scenario: A window overlapping another category's window is rejected

- **WHEN** a create or edit request carries a window that covers a day already covered by another category's stored window
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: Overlap within the candidate set is rejected

- **WHEN** a create or edit request carries two windows that cover a shared day
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: A shared endpoint day is an overlap

- **WHEN** one window ends on 2026-07-14 and another begins on 2026-07-14
- **THEN** the request is rejected, because both cover that day

#### Scenario: Adjacent windows are accepted

- **WHEN** one window ends on 2026-07-14 and another begins on 2026-07-15
- **THEN** the request is accepted, because the two share no day

#### Scenario: An edit may keep its own windows

- **WHEN** a category is edited keeping the windows it already holds and changing only its name
- **THEN** the request is accepted, because a category's own stored windows are replaced rather than compared against

#### Scenario: A rejected overlap leaves everything unchanged

- **WHEN** a create or edit is rejected for overlapping windows
- **THEN** every stored category, expression, window, and transaction is exactly as it was

## MODIFIED Requirements

### Requirement: The category management surface is the only way a category is written

The system SHALL expose a category management surface under `/api/categories`. A
`GET /api/categories` SHALL return every stored category as a JSON array. A
`POST /api/categories` SHALL create a category from a JSON body naming its name, its regular
expressions, and its date windows. A `PUT /api/categories/:id` SHALL replace the name, the regular
expressions, and the date windows of the category the identity names. A `DELETE /api/categories/:id`
SHALL delete the category the identity names. The surface SHALL answer JSON in every case, including
its errors. The system SHALL NOT expose any other endpoint that creates, changes, or deletes a
category, and SHALL NOT allow a category to be written through the transactions endpoint.

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

#### Scenario: The transactions endpoint writes no category

- **WHEN** a request that creates, changes, or deletes is made to the transactions endpoint
- **THEN** no category is created, changed, or deleted

### Requirement: A category carries exactly an identity, a name, and a regular expression

A category returned by the management surface SHALL be a JSON object holding exactly `id`,
`name`, `patterns`, `hidden`, and `windows`. The `id` SHALL be the storage identity rendered as a
string, and is storage metadata rather than a domain element. The `name` SHALL be the stored text.
`patterns` SHALL be a JSON array of strings holding every regular expression the category stores,
in the order the expressions were stored; it SHALL be empty for a category defined only by date
windows. `hidden` SHALL be the stored boolean flag, rendered as a JSON boolean. `windows` SHALL be
a JSON array holding the category's date windows in the order they were stored, each window a JSON
object holding exactly `from` and `to`, each a full `YYYY-MM-DD` calendar date; it SHALL be empty
for a category defined only by expressions. The surface SHALL return the regular expressions and
the date windows, which the transactions read endpoint does not, because managing a category
requires reading and editing them. The listing SHALL be ordered by identity from smallest to
largest, so the order is total and stable.

#### Scenario: A returned category holds its name and expression

- **WHEN** a category stored with the name "Urlaub", the expressions `rewe` and `edeka`, hidden `true`, and the window 2026-07-01 to 2026-07-14 is returned
- **THEN** its object holds `id`, `name` "Urlaub", `patterns` `["rewe","edeka"]`, `hidden` `true`, and `windows` `[{"from":"2026-07-01","to":"2026-07-14"}]`, and no other field

#### Scenario: A category defined only by windows has no expression

- **WHEN** a date-only category is returned
- **THEN** its `patterns` is an empty array and its `windows` holds its window

#### Scenario: A category defined only by expressions has no window

- **WHEN** a category with expressions and no window is returned
- **THEN** its `windows` is an empty array

#### Scenario: The expression is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries every one of its expressions in `patterns`, so each expression can be displayed and edited

#### Scenario: The windows are visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries every one of its windows in `windows`, so each window can be displayed and edited

#### Scenario: The hidden flag is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries its `hidden` boolean, so a category's visibility can be displayed and edited

#### Scenario: The listing has a stable order

- **WHEN** the listing is returned twice against the same stored categories
- **THEN** the categories appear in the same order, sorted by identity from smallest to largest

### Requirement: A regular expression must be compilable before it is stored

A create or an edit SHALL require the category to carry at least one regular expression or at least
one date window; a request carrying neither SHALL be rejected with a client error status and no
stored change. A request MAY carry no regular expression when it carries at least one date window.
When expressions are carried they SHALL be a list of strings, and every expression in that list
SHALL compile as a regular expression. The request SHALL be rejected with a client error status and
no stored change when the expressions are not a list of strings, or contain an expression that
cannot be compiled. The system SHALL NOT store an expression that the category assignment cannot
apply. An empty expression SHALL be accepted as one element of the list, because it is a
well-formed expression.

#### Scenario: An uncompilable expression is rejected

- **WHEN** a create or edit request carries a list one of whose expressions no regular expression engine can compile
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: An empty expression is accepted

- **WHEN** a create request carries a non-empty list one of whose expressions is empty
- **THEN** the category is stored, because an empty expression is a well-formed expression

#### Scenario: A missing or empty expression list is rejected

- **WHEN** a create request carries no expressions and no windows, or an empty list of each
- **THEN** the request is rejected with a client error status and no category is created

#### Scenario: A date-only category needs no expression

- **WHEN** a create request carries an empty expression list and one valid window
- **THEN** the category is stored, because a date window defines membership

#### Scenario: An item that is not a string is rejected

- **WHEN** a create or edit request carries a list that holds a value which is not a string
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: Several expressions are stored together

- **WHEN** a create request carries several compilable expressions
- **THEN** the category is stored carrying all of them, and no expression is dropped
