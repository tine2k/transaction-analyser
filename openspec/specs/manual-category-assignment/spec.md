# Manual Category Assignment Specification

## Purpose

Lets a user pin a transaction's category by hand — one transaction or a bulk selection — and keeps
that explicit choice ahead of rule-driven re-evaluation until the user clears it or its category is
deleted.

## Requirements

### Requirement: The assignment operation sets a transaction's category and records it as manual

The system SHALL provide a write operation, `POST /api/transactions/category-assignments`, accepting
a JSON body that names one or more transaction identities and a category identity or `null`. When
the body names a stored category, every named transaction SHALL hold that category and its
assignment SHALL be recorded as manual. The successful answer SHALL state the number of named
transactions the operation wrote. Every answer SHALL be JSON.

#### Scenario: One transaction is assigned

- **WHEN** a request names one stored transaction and a stored category
- **THEN** that transaction holds the category and its assignment is recorded as manual

#### Scenario: Several transactions are assigned together

- **WHEN** a request names three stored transactions and a stored category
- **THEN** all three hold the category and the answer states that three transactions were written

#### Scenario: A repeated identity is assigned and counted once

- **WHEN** a request names the same transaction more than once
- **THEN** the transaction is assigned once and counted once in the answer

### Requirement: Clearing the manual assignment re-evaluates the named transactions immediately

When the body's category is `null`, the system SHALL clear every named transaction's manual
assignment and assign each of them by the matching rule of `category-assignment` as part of the
same operation, so a transaction a stored category matches is not left uncategorised. Clearing SHALL
NOT create, change, or delete a category.

#### Scenario: A cleared transaction falls back to the matching rule at once

- **WHEN** a manually assigned transaction's manual assignment is cleared and a stored category matches its purpose line, counterparty name, or booking date
- **THEN** it holds the category the matching rule selects, without waiting for another category change

#### Scenario: A cleared transaction that matches nothing is uncategorised

- **WHEN** a manually assigned transaction's manual assignment is cleared and no stored category matches it
- **THEN** its category reads as absent

#### Scenario: Clearing writes no category

- **WHEN** a clearing runs
- **THEN** no category is created, changed, or deleted

### Requirement: The operation applies to every named transaction or to none

A request that names no transaction, a transaction that is not stored, or a category that is not
stored SHALL be refused as a client error with no stored change, so the operation never applies to
part of its named set. A request carrying a transaction identity or a category identity that is not
a storage identity SHALL likewise be refused with no stored change.

#### Scenario: An unknown transaction refuses the whole request

- **WHEN** a request names one stored transaction and one transaction that is not stored
- **THEN** the request is answered with a client error and neither transaction is changed

#### Scenario: An empty set of transactions is refused

- **WHEN** a request names no transaction
- **THEN** the request is answered with a client error and nothing is changed

#### Scenario: An unknown category is refused

- **WHEN** a request names stored transactions and a category that is not stored
- **THEN** the request is answered with a client error and no transaction is changed

### Requirement: The operation is serialized with category changes

The operation SHALL run as one unit, so a category create, edit, delete, append, or a concurrent
assignment completes either entirely before or entirely after it, and no transaction is left
referencing a category the operation could not have observed in full.

#### Scenario: A concurrent category delete does not leave a stale reference

- **WHEN** an assignment naming a category runs concurrently with the deletion of that category
- **THEN** after both settle, no transaction of the assignment references the deleted category

#### Scenario: Concurrent assignments are serialized

- **WHEN** two assignments are submitted concurrently
- **THEN** both complete and every named transaction holds the category one of the two named last

### Requirement: The operation changes only category references

The operation SHALL change only each named transaction's category reference and manual-assignment
state, leaving its booking date, value date, amount, purpose line, counterparty name, and
counterparty account exactly as they were. It SHALL create, change, or delete no category.

#### Scenario: Other transaction values are unchanged

- **WHEN** the operation assigns a transaction
- **THEN** every other value of that transaction is exactly what it was

#### Scenario: No category is written

- **WHEN** the operation runs
- **THEN** no category is created, changed, or deleted

### Requirement: A refused or failed operation is reported as an error, never as a success

A validation refusal SHALL be answered with a client error status. A failure, such as an unreachable
database, SHALL be answered with an error status and SHALL NOT be answered as a success. No response
body and no log line SHALL contain the database address, a user name, a password, or any part of a
connection string.

#### Scenario: A validation refusal is a client error

- **WHEN** the operation refuses a request
- **THEN** the answer carries a client error status and no stored change

#### Scenario: A database failure is an error, not a success

- **WHEN** the database cannot be reached
- **THEN** the operation answers with an error status and does not claim the assignment succeeded

#### Scenario: No credential is disclosed in a failure

- **WHEN** the operation reports a failure
- **THEN** the response body contains no database address, user name, password, or connection string

### Requirement: The transactions table offers a per-row category select

The category column of every transaction row SHALL offer an assignment control: a select whose
choices are the stored categories — each hidden category marked as hidden — and an `Uncategorised`
choice. Choosing a stored category SHALL invoke the assignment operation for that transaction and
that category; choosing `Uncategorised` SHALL invoke it with `null`, clearing any manual assignment.
The browser SHALL NOT create a category, evaluate a regular expression, or decide an assignment
itself.

#### Scenario: Choosing a category assigns the row

- **WHEN** a stored category is chosen in a row's assignment control
- **THEN** the assignment operation is invoked with that transaction and that category

#### Scenario: Choosing Uncategorised clears the manual assignment

- **WHEN** `Uncategorised` is chosen in a manually assigned row's control
- **THEN** the assignment operation is invoked with that transaction and no category, and the row falls back to the matching rule

#### Scenario: Choosing Uncategorised on a rule-derived row changes nothing

- **WHEN** `Uncategorised` is chosen in a row that is assigned by the matching rule
- **THEN** no manual assignment is invented and the row stays with the category the rule selects

#### Scenario: Hidden categories are offered and marked

- **WHEN** a stored category is hidden and a row's control is inspected
- **THEN** the hidden category is among the choices and is marked as hidden

#### Scenario: The control creates no category

- **WHEN** a category is chosen in a row's control
- **THEN** no category is created and the server performs the assignment

### Requirement: A manually assigned row carries a marker

A row whose assignment is manual SHALL carry a visible marker distinguishing it from a rule-derived
assignment. The marker SHALL NOT change, replace, or hide any transaction value, and SHALL be
exposed to assistive technology. A row assigned by the matching rule SHALL carry no such marker.

#### Scenario: A manually assigned row is marked

- **WHEN** a row's assignment is manual
- **THEN** the row carries the marker

#### Scenario: A rule-derived row is not marked

- **WHEN** a row's assignment is the one the matching rule selects
- **THEN** the row carries no manual-assignment marker

#### Scenario: The marker clears when the manual assignment is cleared

- **WHEN** a manually assigned row's manual assignment is cleared
- **THEN** the row no longer carries the marker

#### Scenario: The marker changes no transaction value

- **WHEN** a row carries the marker
- **THEN** every value shown in that row is unchanged

### Requirement: The table offers row selection with a select-all control

The table SHALL give each transaction row a selection checkbox and its header a select-all checkbox.
The select-all control SHALL select every row currently shown and SHALL clear the selection when
every shown row is already selected, and it SHALL reflect whether all, some, or none of the shown
rows are selected. Changing the category or period filter SHALL clear the selection, so no row that
is no longer shown remains selected.

#### Scenario: The header control selects every shown row

- **WHEN** the header select-all control is used and not every shown row is selected
- **THEN** every row currently shown becomes selected

#### Scenario: The header control clears the selection

- **WHEN** every shown row is selected and the header control is used
- **THEN** no row remains selected

#### Scenario: A partial selection is reflected

- **WHEN** some but not all shown rows are selected
- **THEN** the header control reflects that only part of the shown rows are selected

#### Scenario: A filter change clears the selection

- **WHEN** the category or period filter changes while rows are selected
- **THEN** no row remains selected

### Requirement: A bulk bar assigns the selected transactions together

When at least one row is selected, the page SHALL show a fixed bulk bar stating the selection count
and offering the stored categories — each hidden one marked as hidden — and an `Uncategorised`
choice. Applying a stored category SHALL invoke the assignment operation once with every selected
transaction identity and that category; choosing `Uncategorised` SHALL invoke it once with `null`,
clearing their manual assignments.

#### Scenario: The bar appears with the selection count

- **WHEN** rows are selected
- **THEN** the bulk bar is shown stating how many transactions are selected

#### Scenario: Applying assigns every selected transaction

- **WHEN** a stored category is applied in the bulk bar
- **THEN** one assignment naming every selected transaction is invoked and each of them holds the category

#### Scenario: Uncategorised clears the selected transactions' manual assignments

- **WHEN** `Uncategorised` is applied in the bulk bar
- **THEN** one assignment naming every selected transaction and no category is invoked

#### Scenario: Hidden categories are offered and marked

- **WHEN** a stored category is hidden and the bulk bar is inspected
- **THEN** the hidden category is among the choices and is marked as hidden

### Requirement: The bulk bar clears the selection on success or on request

The bulk bar SHALL offer a control that clears the selection without invoking an assignment, and a
successful bulk application SHALL clear the selection. The bar SHALL not be shown while no row is
selected.

#### Scenario: A successful application clears the selection

- **WHEN** the bulk assignment succeeds
- **THEN** the selection is cleared and the bulk bar is no longer shown

#### Scenario: Clearing the selection hides the bar without assigning

- **WHEN** the bar's clear control is used
- **THEN** no assignment is invoked and the bar is no longer shown

#### Scenario: No selection shows no bar

- **WHEN** no row is selected
- **THEN** the bulk bar is not shown

### Requirement: An in-flight assignment disables its control

While an assignment is in flight, the control that started it SHALL be disabled and SHALL start no
second request, and the control SHALL be enabled again when the assignment settles. A bulk
assignment in flight SHALL disable the bulk bar's controls without disabling the table's rows.

#### Scenario: A row's control is disabled while its assignment is in flight

- **WHEN** an assignment started from a row's control is in flight
- **THEN** that control is disabled and starts no second request

#### Scenario: The bulk bar is disabled while its assignment is in flight

- **WHEN** a bulk assignment is in flight
- **THEN** the bar's controls are disabled, the table's rows stay displayed, and no second bulk request starts

#### Scenario: The control is enabled when the assignment settles

- **WHEN** the assignment answers
- **THEN** the control is enabled again

### Requirement: Each affected row carries a marker until its result is reflected

From the moment an assignment is sent, each row it names SHALL carry a visible marker, and the
marker SHALL remain until the displayed row reflects the assignment's result. The marker SHALL NOT
change, replace, or hide any transaction value, and SHALL be exposed to assistive technology.

#### Scenario: The affected rows are marked

- **WHEN** an assignment is sent for one or more rows
- **THEN** each named row carries the marker

#### Scenario: The marker clears once the row reflects the result

- **WHEN** the refresh that reflects the assignment's result has been applied
- **THEN** the marker is removed from the row

#### Scenario: The marker changes no transaction value

- **WHEN** a row carries the marker
- **THEN** every value shown in that row is unchanged

### Requirement: The system refreshes once after assignments settle and updates in place

When one or more assignments complete, the system SHALL request the transactions once after the last
in-flight assignment settles, and SHALL update the displayed rows in place when the response
arrives. A response that no longer reflects the latest state SHALL NOT replace newer data. A failed
refresh SHALL leave the displayed rows in place and report that they could not be refreshed.

#### Scenario: Several assignments cause one refresh

- **WHEN** several assignments complete in quick succession
- **THEN** the transactions are requested once, after the last assignment settles

#### Scenario: A superseded response does not replace newer data

- **WHEN** a refresh response arrives after a newer refresh response has been applied
- **THEN** the older response is ignored

#### Scenario: A failed refresh keeps the displayed rows

- **WHEN** the refresh request fails
- **THEN** the previously displayed rows remain and the failure is reported

### Requirement: A failed assignment is reported and changes nothing, and a retry needs no re-selection

A failed assignment SHALL be reported distinctly and SHALL change no displayed transaction or
category value. After a failed bulk assignment the selection SHALL remain, so it can be retried
without selecting again, and after a failed per-row assignment the row's displayed category SHALL
remain the value it had.

#### Scenario: A failed assignment is reported and changes nothing

- **WHEN** an assignment fails
- **THEN** the failure is reported and no displayed transaction or category value changes

#### Scenario: The bulk selection remains for a retry

- **WHEN** a bulk assignment fails
- **THEN** the selected rows remain selected

#### Scenario: A failed per-row assignment leaves the row's value

- **WHEN** an assignment started from a row's control fails
- **THEN** the row's displayed category remains the value it had

### Requirement: The assignment controls are operable by keyboard and touch

The row's assignment control, the selection checkboxes, the select-all control, and the bulk bar's
controls SHALL be reachable and operable by keyboard alone, and each SHALL provide a touch target at
least 44 CSS pixels high. They SHALL NOT require a precision pointer.

#### Scenario: The controls are keyboard operable

- **WHEN** the table and bulk bar are used by keyboard alone
- **THEN** a category can be chosen for a row, rows can be selected, and a bulk category can be applied

#### Scenario: The controls meet the touch target size

- **WHEN** the controls are shown on a touch viewport
- **THEN** each provides a touch target at least 44 CSS pixels high
