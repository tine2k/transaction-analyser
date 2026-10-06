# Spec Delta

## MODIFIED Requirements

### Requirement: The imports screen shows the recent runs

The imports screen SHALL request the records from the same origin and show one row per returned run carrying its start time, source, whether it was non-writing, its outcome, its counts — read, already stored, written, and written rows categorised — and its failure reason. The source SHALL be shown so that a scheduled run, a screen-started sync, and a manual import are distinguishable. The screen SHALL also carry the control that starts the sync, as `easybank-sync` defines. It SHALL show a defined state when no run is returned and a distinct state when the request fails, and SHALL NOT invent a run.

#### Scenario: Every returned run gets a row

- **WHEN** the endpoint returns several runs
- **THEN** the screen shows one row for each, carrying its time, source, outcome, and counts

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
- **THEN** it shows only the runs the endpoint returned, and no example run

## ADDED Requirements

### Requirement: The record states how many written rows were categorised

A record SHALL hold the number of newly written rows that received a category. The number SHALL be zero for a run that wrote no row, and SHALL never exceed the number written. A run whose written rows matched no category SHALL record zero categorised while still recording those rows as written.

#### Scenario: A writing run records its categorised rows

- **WHEN** a writing import writes six rows of which four receive a category
- **THEN** its record holds six written and four categorised

#### Scenario: A run that matched no category records zero

- **WHEN** a writing import writes rows and no stored category matches any of them
- **THEN** its record holds the rows as written and zero categorised

#### Scenario: A non-writing run records no categorised row

- **WHEN** an import runs non-writing
- **THEN** its record holds zero written and zero categorised
