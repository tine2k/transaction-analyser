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

### Requirement: The hidden flag is accepted on create and edit and defaults to visible

A create and an edit SHALL accept a `hidden` value in their JSON body. When `hidden` is present it
SHALL be a JSON boolean, and a request whose `hidden` is present and not a boolean SHALL be
rejected with a client error status and no stored change. When `hidden` is absent from the body,
the surface SHALL treat the category as not hidden, because create and edit replace the stored
category. The value SHALL be stored as given, and the returned category SHALL carry it. Setting
`hidden` SHALL NOT create, change, or delete any transaction, and SHALL NOT change which
transactions a category matches.

#### Scenario: A category is created with the hidden flag set

- **WHEN** a create request carries a name, one or more regular expressions, and `hidden` `true`
- **THEN** the category is stored and returned with `hidden` `true`

#### Scenario: An omitted hidden flag means visible

- **WHEN** a create or edit request carries no `hidden` value
- **THEN** the stored and returned category has `hidden` `false`

#### Scenario: The hidden flag can be toggled by an edit

- **WHEN** an edit request carries `hidden` `true` for a category that was visible
- **THEN** the category is stored and returned with `hidden` `true`

#### Scenario: A non-boolean hidden flag is rejected

- **WHEN** a create or edit request carries a `hidden` value that is not a JSON boolean
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: Hiding a category changes no transaction

- **WHEN** a category is edited to be hidden
- **THEN** no transaction is created, changed, assigned, or deleted, and the transactions the category covers are unchanged

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

### Requirement: The category management surface previews the transactions a date window claims

The category management surface SHALL provide a read-only operation that accepts a non-empty list
of candidate date windows and returns the number of stored transactions the windows would claim. A
transaction SHALL be counted when its booking date falls on or between the `from` and `to` of at
least one candidate window, inclusive of both endpoints, and no stored category's regular
expression matches its purpose line. Window coverage SHALL follow `category-assignment`: the
booking date alone is tested, and the value date is not consulted; expression matching SHALL be
case-insensitive and against any part of the purpose line. A transaction SHALL be counted once
regardless of how many candidate windows cover it, and a transaction claimed by a stored
category's expression SHALL NOT be counted. The operation SHALL validate the windows using the
same shape and date rules as category creation and editing — a list of objects holding exactly
`from` and `to`, each a full `YYYY-MM-DD` calendar date, with `from` not later than `to` — and
SHALL return a client error for a missing, empty, non-array, malformed, or reversed window list.
It SHALL NOT enforce the stored non-overlap rule, because it creates no stored window and
overlapping candidate windows are counted once. It SHALL NOT create or change a category, assign
or reassign a transaction, or otherwise modify stored data. Its successful JSON response SHALL
contain the count as an integer. Failures SHALL be reported as errors rather than as a fabricated
count.

#### Scenario: A preview returns the number of transactions the windows claim

- **WHEN** a valid non-empty list of candidate windows is submitted for preview
- **THEN** the response returns the number of stored transactions whose booking date falls in at least one window and whose purpose line matches no stored category's expression

#### Scenario: A transaction already claimed by a stored expression is not counted

- **WHEN** a transaction's booking date falls in a candidate window and a stored category's regular expression matches its purpose line
- **THEN** the transaction is excluded from the returned count, because the window would not claim it

#### Scenario: Both window endpoints are inclusive

- **WHEN** a transaction's booking date is exactly the `from` date or exactly the `to` date of a candidate window and no expression matches it
- **THEN** the transaction is counted

#### Scenario: The value date does not decide a claimed transaction

- **WHEN** a transaction's booking date falls outside a candidate window and its value date falls inside it, and no expression matches its purpose line
- **THEN** the transaction is not counted, because the booking date alone is tested

#### Scenario: Each transaction contributes at most one

- **WHEN** one transaction's booking date falls in several candidate windows
- **THEN** it contributes exactly one to the returned count

#### Scenario: An invalid window list is refused

- **WHEN** a preview request has no windows, is not a list, or contains a window that is not an object, holds more than `from` and `to`, has a malformed or impossible date, or has `from` after `to`
- **THEN** the request receives a client error and no stored data is changed

#### Scenario: Overlapping candidate windows are still counted once

- **WHEN** a preview request carries two candidate windows that cover a shared day
- **THEN** the request succeeds, because the non-overlap rule governs stored windows and not a read-only preview, and each transaction is counted once

#### Scenario: Preview leaves category and transaction data unchanged

- **WHEN** a valid preview request is completed
- **THEN** no category is created, changed, or deleted, and no transaction is created, changed, assigned, or deleted

#### Scenario: A database failure is not reported as a count

- **WHEN** the database cannot be reached or no database address is configured
- **THEN** the preview responds with an error and not a success response containing a count
