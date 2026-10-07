# Category Recategorisation Specification

## Purpose

Lets a user re-apply the stored categories to every stored transaction on demand and see how many
transactions changed, without recording an import run or changing any other value.

## Requirements

### Requirement: The category management surface re-evaluates every stored transaction on demand

The system SHALL provide an operation on the category management surface that re-evaluates every
stored transaction against the stored categories and sets each transaction's category to the one
the `category-assignment` rule selects, or leaves it uncategorised. It SHALL answer with the number
of transactions whose category changed, and SHALL be idempotent: repeated with no intervening
change it SHALL report zero.

#### Scenario: A previously uncategorised transaction gains a category

- **WHEN** the current categories match a stored uncategorised transaction and the operation runs
- **THEN** the transaction holds the selected category and the operation reports it as changed

#### Scenario: A transaction whose match has gone becomes uncategorised

- **WHEN** a stored categorised transaction matches no current category and the operation runs
- **THEN** its category reads as absent and the operation reports it as changed

#### Scenario: A transaction moves between categories

- **WHEN** the selected category for a stored transaction differs from the one it holds and the operation runs
- **THEN** the transaction holds the selected category and is reported as changed

#### Scenario: An unchanged assignment is not counted

- **WHEN** a stored transaction already holds the category the rule selects and the operation runs
- **THEN** the operation does not count it as changed

#### Scenario: A repeat reports zero

- **WHEN** the operation runs twice with no intervening change
- **THEN** the second run reports zero changed

#### Scenario: An empty table reports zero

- **WHEN** no transaction is stored and the operation runs
- **THEN** the operation reports zero changed and does not fail

### Requirement: Re-categorisation changes only category references and records no run

The operation SHALL change only each transaction's category reference, leaving its booking date,
value date, amount, purpose line, counterparty name, and counterparty account exactly as they were.
It SHALL create, change, or delete no category, create no import run, and store no report; the
changed count SHALL exist only in the operation's answer.

#### Scenario: Other transaction values are unchanged

- **WHEN** the operation changes a transaction's category
- **THEN** every other value of that transaction is exactly what it was

#### Scenario: No category is written

- **WHEN** the operation runs
- **THEN** no category is created, changed, or deleted

#### Scenario: No import run is recorded

- **WHEN** the operation runs
- **THEN** the import log gains no record

### Requirement: A re-categorisation does not interleave with a category change or an import

The operation SHALL run as one unit, so a category create, edit, delete, append, or an import that
runs concurrently completes either before or after it, and no transaction is left categorised by a
category set the operation did not read in full.

#### Scenario: A concurrent category change is serialized

- **WHEN** a category change and the operation are submitted concurrently
- **THEN** both complete and every stored transaction's category agrees with the categories stored at the end

#### Scenario: Concurrent re-categorisations are serialized

- **WHEN** two operations are submitted concurrently
- **THEN** both complete, the assignments agree with the stored categories, and the changed transactions are counted once across the two answers

### Requirement: The imports screen offers a re-categorisation control

The imports screen SHALL offer a control that triggers the re-categorisation operation through a
same-origin request. While the request is in flight the control SHALL be disabled and SHALL start no
second request. When the request answers, the screen SHALL show the returned number of changed
transactions as a transient message that SHALL NOT survive a reload of the screen and SHALL NOT be
stored. A failed request SHALL be reported as a failure rather than as a zero count.

#### Scenario: The control starts the operation

- **WHEN** the control is used
- **THEN** a same-origin request starts the re-categorisation

#### Scenario: The control is disabled while the request runs

- **WHEN** the request is in flight
- **THEN** the control is disabled and no second request starts

#### Scenario: The control is enabled again when the request answers

- **WHEN** the request answers
- **THEN** the control is enabled

#### Scenario: The changed count is shown

- **WHEN** the operation reports a number of changed transactions
- **THEN** the screen shows that number

#### Scenario: The report does not survive a reload

- **WHEN** the screen is reloaded after a report
- **THEN** no previous count is shown

#### Scenario: A failure is not shown as zero

- **WHEN** the request fails
- **THEN** the screen reports the failure and does not show a zero count

#### Scenario: The browser writes nothing itself

- **WHEN** the control is used
- **THEN** the browser evaluates no category expression and changes no stored row, and the server performs the re-categorisation
