# Spec Delta

## MODIFIED Requirements

### Requirement: The category management surface previews transaction match counts

The category management surface SHALL provide a read-only operation that accepts a non-empty list of candidate regular expressions and returns the number of stored transactions whose purpose line or counterparty name matches at least one expression. Matching SHALL follow `category-assignment`: case-insensitive and against any part of the purpose line or the counterparty name. A transaction SHALL be counted once regardless of how many candidate expressions match, and SHALL be counted even if another category currently wins assignment. The operation SHALL validate the expressions using the same rules as category creation and editing, returning a client error for a missing, empty, non-string, or uncompilable expression list. It SHALL NOT create or change a category, assign or reassign a transaction, or otherwise modify stored data. Its successful JSON response SHALL contain the count as an integer. Failures SHALL be reported as errors rather than as a fabricated count.

#### Scenario: A preview returns the number of matching transactions

- **WHEN** a valid non-empty list of candidate expressions is submitted for preview
- **THEN** the response returns the number of stored transactions matching at least one expression

#### Scenario: Matching follows category assignment semantics

- **WHEN** a purpose line contains a match that differs in case or is only a substring match
- **THEN** the transaction is included in the preview count

#### Scenario: A counterparty-name match is included

- **WHEN** a transaction's purpose line matches no candidate expression and its counterparty name matches one
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
returns the number of stored transactions whose purpose line or counterparty name contains it,
matched case-insensitively and literally. It SHALL validate the text as an append does, count each
transaction once, change no category or transaction, and answer with the count as an integer. A
failure SHALL be reported as an error rather than as a fabricated count.

#### Scenario: A preview returns the number of matching transactions

- **WHEN** a valid text is submitted for preview
- **THEN** the response returns the number of stored transactions whose purpose line or counterparty name contains that text

#### Scenario: Matching is case-insensitive

- **WHEN** a purpose line contains the text with a different letter case
- **THEN** the transaction is counted

#### Scenario: A counterparty-name match is counted

- **WHEN** a transaction's counterparty name contains the text and its purpose line does not
- **THEN** the transaction is counted

#### Scenario: A metacharacter in the text matches literally

- **WHEN** the text contains a regular-expression metacharacter
- **THEN** only transactions whose purpose line or counterparty name contains that literal character are counted

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

### Requirement: The category management surface previews the transactions a date window claims

The category management surface SHALL provide a read-only operation that accepts a non-empty list
of candidate date windows and returns the number of stored transactions the windows would claim. A
transaction SHALL be counted when its booking date falls on or between the `from` and `to` of at
least one candidate window, inclusive of both endpoints, and no stored category's regular
expression matches its purpose line or counterparty name. Window coverage SHALL follow
`category-assignment`: the booking date alone is tested, and the value date is not consulted;
expression matching SHALL be case-insensitive and against any part of the purpose line or the
counterparty name. A transaction SHALL be counted once regardless of how many candidate windows
cover it, and a transaction claimed by a stored category's expression SHALL NOT be counted. The
operation SHALL validate the windows using the same shape and date rules as category creation and
editing — a list of objects holding exactly `from` and `to`, each a full `YYYY-MM-DD` calendar
date, with `from` not later than `to` — and SHALL return a client error for a missing, empty,
non-array, malformed, or reversed window list. It SHALL NOT enforce the stored non-overlap rule,
because it creates no stored window and overlapping candidate windows are counted once. It SHALL
NOT create or change a category, assign or reassign a transaction, or otherwise modify stored
data. Its successful JSON response SHALL contain the count as an integer. Failures SHALL be
reported as errors rather than as a fabricated count.

#### Scenario: A preview returns the number of transactions the windows claim

- **WHEN** a valid non-empty list of candidate windows is submitted for preview
- **THEN** the response returns the number of stored transactions whose booking date falls in at least one window and whose purpose line or counterparty name matches no stored category's expression

#### Scenario: A transaction already claimed by a stored expression is not counted

- **WHEN** a transaction's booking date falls in a candidate window and a stored category's regular expression matches its purpose line or counterparty name
- **THEN** the transaction is excluded from the returned count, because the window would not claim it

#### Scenario: A counterparty-name match excludes a window claim

- **WHEN** a transaction's booking date falls in a candidate window and a stored category's regular expression matches its counterparty name
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
