# Spec Delta

## ADDED Requirements

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
