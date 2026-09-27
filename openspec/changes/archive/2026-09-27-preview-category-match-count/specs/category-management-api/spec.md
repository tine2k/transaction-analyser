# Spec Delta

## ADDED Requirements

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
