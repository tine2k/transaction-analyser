# Spec Delta

## MODIFIED Requirements

### Requirement: The imports screen shows the recent runs

The imports screen SHALL request the records from the same origin and show one row per returned run carrying its start time, source, whether it was non-writing, its outcome, its counts — read, already stored, written, and written rows categorised — its person, and its failure reason. Below the `sm` breakpoint the row SHALL show its start time, source, outcome, and written count directly and SHALL carry the remaining fields in an in-row expandable detail. The source SHALL be shown so that a scheduled run, a screen-started sync, and a manual import are distinguishable. The person SHALL be shown by the referenced person's current name, and a run carrying no person SHALL read as not recorded rather than as a person named for the absence. The screen SHALL also carry the control that starts the sync, as `easybank-sync` defines. It SHALL show a defined state when no run is returned and a distinct state when the request fails, and SHALL NOT invent a run or a person.

#### Scenario: Every returned run gets a row

- **WHEN** the endpoint returns several runs
- **THEN** the screen shows one row for each, carrying its time, source, person, outcome, and counts

#### Scenario: A phone row still carries every field

- **WHEN** the import log is shown below the `sm` breakpoint
- **THEN** each run's row shows its start time, source, outcome, and written count directly and carries its remaining fields in its in-row detail, so no returned value is absent from the row

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

### Requirement: The phone import log shows priority columns and expandable detail

Below the `sm` breakpoint, each import run's row SHALL present its start time, source, outcome, and written count, and SHALL offer a disclosure control that reveals the person, mode, read count, already-stored count, categorised count, and failure reason in place. From `sm` up all ten columns SHALL remain. No run or field SHALL be omitted, and expanding SHALL make no data request.

#### Scenario: A phone row shows the priority values

- **WHEN** the import log is shown below the `sm` breakpoint
- **THEN** each visible run shows its start time, source, outcome, and written count before any detail is expanded

#### Scenario: Expanding reveals the remaining fields in place

- **WHEN** a phone reader expands a run's disclosure
- **THEN** that run's person, mode, read count, already-stored count, categorised count, and failure reason become visible within the same row

#### Scenario: Every run has a row and a disclosure

- **WHEN** the endpoint returns several runs
- **THEN** the phone log shows one row for each run and each row offers its own disclosure control

#### Scenario: Collapsing keeps the run

- **WHEN** a phone reader collapses an expanded run
- **THEN** the detail is hidden and the run's priority values remain in place

#### Scenario: The wider log keeps every column

- **WHEN** the import log is shown from the `sm` breakpoint up
- **THEN** all ten existing columns remain present and no disclosure is required to read any field

#### Scenario: Expanding makes no request

- **WHEN** a phone reader expands or collapses a run
- **THEN** no data request is made and no stored run, person, or transaction changes

### Requirement: The import log disclosure is identifiable and touch sized

The disclosure control SHALL have an accessible name that identifies both its import run and the action, SHALL expose whether its detail is expanded, SHALL have a hit area at least 44 CSS pixels high, and SHALL be operable by keyboard. The control SHALL NOT start a sync or change stored data.

#### Scenario: The control names its run and action

- **WHEN** a phone reader inspects a run's disclosure control
- **THEN** its accessible name identifies that run, for example by its start time and source, as well as the action of showing or hiding the detail

#### Scenario: The expanded state is exposed

- **WHEN** a disclosure is activated
- **THEN** the control reports its new expanded or collapsed state to assistive technology

#### Scenario: The control is touch sized

- **WHEN** the import log is shown below the `sm` breakpoint
- **THEN** every disclosure control has a hit area at least 44 CSS pixels high

#### Scenario: The control is operable by keyboard

- **WHEN** a keyboard user focuses a disclosure control and activates it
- **THEN** the detail expands or collapses, focus stays visible, and no sync starts

#### Scenario: Expanding changes no stored data

- **WHEN** a disclosure is activated
- **THEN** no import run, person, category, or transaction is created, altered, or deleted
