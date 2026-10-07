# Spec Delta

## Purpose

Lets a user turn text selected in the transactions table into a category pattern in place, without
leaving the table and without waiting for the server to re-evaluate stored transactions.

## ADDED Requirements

### Requirement: The transactions screen offers an action bar for a valid selection

The system SHALL present a fixed action bar when the user selects at least three characters, after
trimming, inside a single cell of the transactions table. The bar SHALL show the captured text and
the stored categories. It SHALL NOT appear when the trimmed selection is shorter than three
characters, spans more than one cell, or lies outside the table. It SHALL hide when the selection is
cleared, unless its category control holds focus, in which case it SHALL remain.

#### Scenario: A valid selection shows the bar

- **WHEN** the user selects at least three characters inside one cell of the transactions table
- **THEN** the action bar appears showing the captured text and the stored categories

#### Scenario: A short selection shows no bar

- **WHEN** the trimmed selection is shorter than three characters
- **THEN** no action bar appears

#### Scenario: A multi-cell selection shows no bar

- **WHEN** the selection spans more than one cell of the table
- **THEN** no action bar appears

#### Scenario: A selection outside the table shows no bar

- **WHEN** the user selects text outside the transactions table
- **THEN** no action bar appears

#### Scenario: The bar remains while its control has focus

- **WHEN** the user focuses the bar's category control and the document selection collapses
- **THEN** the bar still shows the captured text and offers the categories

#### Scenario: The bar hides when the selection is cleared

- **WHEN** the selection is cleared while the bar's category control does not hold focus
- **THEN** the action bar is hidden

### Requirement: The bar previews the matching transaction count

When the bar appears, the system SHALL request the read-only literal match count for the captured
text and SHALL show the returned count. A pending preview SHALL NOT block choosing a category. A
failed preview SHALL be shown as unavailable and SHALL NOT be shown as a zero count.

#### Scenario: The match count is shown

- **WHEN** the literal match count for the captured text is returned
- **THEN** the bar shows that count

#### Scenario: A failed preview is unavailable, not zero

- **WHEN** the literal match count request fails
- **THEN** the bar reports the count as unavailable rather than as zero

#### Scenario: A category can be chosen while the preview is pending or failed

- **WHEN** the preview has not returned or has failed
- **THEN** the categories are still offered and a category can be chosen

### Requirement: Choosing a stored category appends the captured text as a literal pattern

Choosing a category in the bar SHALL invoke the category management surface's append operation
with the captured text and the chosen category. The browser SHALL NOT evaluate a regular
expression, escape the text, assign a category, or create a category. The bar SHALL offer only
stored categories.

#### Scenario: Choosing invokes the append with the captured text

- **WHEN** a stored category is chosen in the bar
- **THEN** the append operation is invoked with the captured text and that category

#### Scenario: The browser evaluates no expression and assigns no category

- **WHEN** the shortcut is used
- **THEN** the browser evaluates no regular expression and assigns no transaction a category

#### Scenario: Only stored categories are offered

- **WHEN** the bar is shown
- **THEN** its choices are the stored categories and no control creates a category

#### Scenario: An already-stored pattern is reported as such

- **WHEN** the append reports that the pattern was already stored
- **THEN** the system reports that rather than claiming a new pattern was added

### Requirement: Appends do not block the table and may overlap

After a category is chosen, the bar SHALL close and the user SHALL be able to start another
selection immediately, whether or not the append has finished. The system SHALL NOT replace the
table with a loading state, disable its rows, or wait for an append to settle before accepting
another. Several appends MAY be in flight at once.

#### Scenario: A second selection can start before the first append settles

- **WHEN** a category has been chosen and its append is still in flight
- **THEN** the user can select text again and use the bar

#### Scenario: The table is not replaced by a loading state

- **WHEN** appends or refreshes are in flight
- **THEN** the table remains displayed with its rows

### Requirement: Each affected row carries a marker until its result is reflected

From the moment an append is sent, the row whose cell held the captured text SHALL carry a visible
marker, and the marker SHALL remain until the displayed row reflects the append's result. The
marker SHALL NOT change, replace, or hide any transaction value, and SHALL be exposed to assistive
technology.

#### Scenario: The affected row is marked

- **WHEN** an append is sent for a selection made in a row
- **THEN** that row carries the marker

#### Scenario: The marker clears once the row reflects the result

- **WHEN** the refresh that reflects the append's result has been applied
- **THEN** the marker is removed from the row

#### Scenario: The marker changes no transaction value

- **WHEN** a row carries the marker
- **THEN** every value shown in that row is unchanged

### Requirement: The system refreshes once after appends settle and updates in place

When one or more appends complete, the system SHALL request the transactions once after the last
in-flight append settles, and SHALL update the displayed rows in place when the response arrives. A
response that no longer reflects the latest state SHALL NOT replace newer data. A failed refresh
SHALL leave the displayed rows in place and report that they could not be refreshed.

#### Scenario: Several appends cause one refresh

- **WHEN** several appends complete in quick succession
- **THEN** the transactions are requested once, after the last append settles

#### Scenario: A superseded response does not replace newer data

- **WHEN** a refresh response arrives after a newer refresh response has been applied
- **THEN** the older response is ignored

#### Scenario: A failed refresh keeps the displayed rows

- **WHEN** the refresh request fails
- **THEN** the previously displayed rows remain and the failure is reported

### Requirement: A failed append is reported and can be retried without re-selecting

A failed append SHALL be reported distinctly, SHALL change no displayed transaction or category,
and SHALL leave the action bar showing the captured text so the user can choose a category again
without re-selecting. A successful append SHALL close the bar.

#### Scenario: A failed append is reported and changes nothing

- **WHEN** an append fails
- **THEN** the failure is reported and no displayed transaction or category value changes

#### Scenario: The bar remains for a retry

- **WHEN** an append fails
- **THEN** the bar still shows the captured text and offers the categories

#### Scenario: A successful append closes the bar

- **WHEN** an append succeeds
- **THEN** the action bar closes

### Requirement: The action bar is operable by keyboard and touch

The action bar SHALL be reachable and operable by keyboard alone, and each of its controls SHALL
provide a touch target at least 44 CSS pixels high. It SHALL NOT require a precision pointer.

#### Scenario: The bar is keyboard operable

- **WHEN** a valid selection is made and the user navigates by keyboard
- **THEN** the bar's category control can be focused and a category chosen

#### Scenario: The bar's controls meet the touch target size

- **WHEN** the bar is shown on a touch viewport
- **THEN** each of its controls provides a touch target at least 44 CSS pixels high
