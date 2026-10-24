# Spec Delta

## MODIFIED Requirements

### Requirement: Every import that starts leaves exactly one record

The system SHALL record one run for every import that starts — the scheduled sync, the manual sync command, the manual CSV import, and the sync started from the imports screen — whether it writes, runs non-writing, or fails. The record SHALL hold the start time, the end time, the source, whether the run was non-writing, the outcome, the counts, the person whose transactions the run imported or would import when one was resolved, and the failure reason when it failed. A run that has started and not finished SHALL read as in progress rather than as a success. A run recorded before the person extension SHALL carry no person and SHALL NOT be retroactively assigned one.

#### Scenario: A scheduled run is recorded

- **WHEN** the nightly sync runs
- **THEN** one record exists for it, naming the scheduled source and the person it resolved

#### Scenario: A run that has not finished is not a success

- **WHEN** a run has started and has not finished
- **THEN** its record reads as in progress, not as a success and not as a failure with a reason

#### Scenario: A manual import is recorded

- **WHEN** the manual CSV import runs
- **THEN** one record exists for it, naming the manual source and the person it imported into

#### Scenario: A screen-started sync is recorded

- **WHEN** the sync is started from the imports screen
- **THEN** one record exists for it, naming the screen source that distinguishes it from the scheduled sync and the manual import, and the person it resolved

#### Scenario: A non-writing run is recorded

- **WHEN** an import runs in its non-writing mode
- **THEN** one record exists for it and it states that the run was non-writing and names the person it would import into

#### Scenario: A failed run is recorded with its reason

- **WHEN** an import fails
- **THEN** one record exists for it, stating the failure and the reason, and naming its person when one was resolved

#### Scenario: A run that never resolved a person records none

- **WHEN** an import fails because its person cannot be resolved
- **THEN** its record states the failure and carries no person

#### Scenario: A legacy run carries no person

- **WHEN** a run was recorded before the person extension
- **THEN** its record carries no person and is not retroactively assigned one

### Requirement: The imports screen shows the recent runs

The imports screen SHALL request the records from the same origin and show one row per returned run carrying its start time, source, whether it was non-writing, its outcome, its counts — read, already stored, written, and written rows categorised — its person, and its failure reason. The source SHALL be shown so that a scheduled run, a screen-started sync, and a manual import are distinguishable. The person SHALL be shown by the referenced person's current name, and a run carrying no person SHALL read as not recorded rather than as a person named for the absence. The screen SHALL also carry the control that starts the sync, as `easybank-sync` defines. It SHALL show a defined state when no run is returned and a distinct state when the request fails, and SHALL NOT invent a run or a person.

#### Scenario: Every returned run gets a row

- **WHEN** the endpoint returns several runs
- **THEN** the screen shows one row for each, carrying its time, source, person, outcome, and counts

#### Scenario: The person is shown

- **WHEN** a returned run names a person
- **THEN** its row shows that person's current name

#### Scenario: A run without a person is marked

- **WHEN** a returned run carries no person
- **THEN** its row reads as not recorded against a person, and no person name is invented

#### Scenario: A renamed person is reflected

- **WHEN** a person named by a returned run is renamed
- **THEN** the run's row shows the new name, because the name is read from the referenced person

#### Scenario: The categorised count is shown

- **WHEN** a returned run wrote rows of which some received a category
- **THEN** its row shows the number of written rows categorised alongside the written count

#### Scenario: A screen-started run is distinguishable

- **WHEN** a returned run was started from the screen
- **THEN** its row names the screen source, distinct from a scheduled row and a manual row

#### Scenario: The screen carries the sync control

- **WHEN** the imports screen is shown
- **THEN** it offers the control that starts the sync, as `easybank-sync` defines

#### Scenario: A non-writing run is marked

- **WHEN** a returned run was non-writing
- **THEN** its row is distinguishable from a run that wrote

#### Scenario: An empty log is explained

- **WHEN** the endpoint returns no run
- **THEN** the screen states that no import has run rather than showing an empty list

#### Scenario: A failed request is explained

- **WHEN** the request fails
- **THEN** the screen states that the import log could not be loaded

#### Scenario: Nothing is invented

- **WHEN** the screen is shown
- **THEN** it shows only the runs and people the endpoint returned, and no example run or person

## ADDED Requirements

### Requirement: The import log returns the person on each run

The system SHALL return, for each run at `GET /api/imports`, a `person` field that is either an
object holding the referenced person's identity as a string and current name, or JSON `null` when the
run carries no person. The endpoint SHALL NOT return a placeholder person, a transaction count, or a
person that the run did not reference. The endpoint SHALL remain read-only and SHALL NOT create,
change, or delete a run or a person.

#### Scenario: A run with a person returns an id and a name

- **WHEN** a run references a person named `Anna`
- **THEN** its `person` field is an object whose `id` is that person's identity and whose `name` is `Anna`

#### Scenario: A run with no person returns null

- **WHEN** a run carries no person
- **THEN** its `person` field is JSON `null`, and no person object is invented

#### Scenario: The name follows the reference

- **WHEN** a person referenced by a run is renamed and the log is requested again
- **THEN** the run's `person.name` reads the new name, because the name is read from the referenced person rather than copied onto the run

#### Scenario: The log does not return a person count

- **WHEN** a run is returned
- **THEN** its `person` object holds no transaction count, because the count belongs to the person management surface

#### Scenario: The log remains read-only

- **WHEN** a request other than the read is made to the import log endpoint
- **THEN** no run and no person is created, changed, or deleted by it
