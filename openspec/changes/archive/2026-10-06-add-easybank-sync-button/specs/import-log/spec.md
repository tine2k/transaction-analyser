# Spec Delta

## MODIFIED Requirements

### Requirement: Every import that starts leaves exactly one record

The system SHALL record one run for every import that starts — the scheduled sync, the manual sync command, the manual CSV import, and the sync started from the imports screen — whether it writes, runs non-writing, or fails. The record SHALL hold the start time, the end time, the source, whether the run was non-writing, the outcome, the counts, and the failure reason when it failed. A run that has started and not finished SHALL read as in progress rather than as a success.

#### Scenario: A scheduled run is recorded

- **WHEN** the nightly sync runs
- **THEN** one record exists for it, naming the scheduled source

#### Scenario: A run that has not finished is not a success

- **WHEN** a run has started and has not finished
- **THEN** its record reads as in progress, not as a success and not as a failure with a reason

#### Scenario: A manual import is recorded

- **WHEN** the manual CSV import runs
- **THEN** one record exists for it, naming the manual source

#### Scenario: A screen-started sync is recorded

- **WHEN** the sync is started from the imports screen
- **THEN** one record exists for it, naming the screen source that distinguishes it from the scheduled sync and the manual import

#### Scenario: A non-writing run is recorded

- **WHEN** an import runs in its non-writing mode
- **THEN** one record exists for it and it states that the run was non-writing

#### Scenario: A failed run is recorded with its reason

- **WHEN** an import fails
- **THEN** one record exists for it, stating the failure and the reason

### Requirement: The imports screen shows the recent runs

The imports screen SHALL request the records from the same origin and show one row per returned run carrying its start time, source, whether it was non-writing, its outcome, its counts, and its failure reason. The source SHALL be shown so that a scheduled run, a screen-started sync, and a manual import are distinguishable. The screen SHALL also carry the control that starts the sync, as `easybank-sync` defines. It SHALL show a defined state when no run is returned and a distinct state when the request fails, and SHALL NOT invent a run.

#### Scenario: Every returned run gets a row

- **WHEN** the endpoint returns several runs
- **THEN** the screen shows one row for each, carrying its time, source, outcome, and counts

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
- **THEN** it shows only the runs the endpoint returned, and no example run
