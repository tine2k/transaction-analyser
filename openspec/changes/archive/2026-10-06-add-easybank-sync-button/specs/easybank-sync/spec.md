# Spec Delta

## ADDED Requirements

### Requirement: The sync can be started from the imports screen

The system SHALL offer a control on the imports screen that starts the same sync the nightly schedule runs: the same credentials read from the environment, the same retrieval window, the same value-date floor, and the same non-writing mode until writing is enabled. The control SHALL start the run through a same-origin request to the server, and the browser SHALL NOT retrieve transactions or write anything itself.

#### Scenario: The control starts the nightly sync

- **WHEN** the control is used
- **THEN** a same-origin request starts the same retrieval, the same value-date floor, and the same non-writing mode the nightly run uses

#### Scenario: The non-writing default applies

- **WHEN** writing is not enabled and the control is used
- **THEN** the run records what it would import and writes no transaction

#### Scenario: An enabled run imports

- **WHEN** writing is enabled and the control is used
- **THEN** the run writes the new rows and records the run as a writing run

### Requirement: A screen-started sync never overlaps another run

A screen-started run SHALL NOT overlap another sync run. A request that arrives while a sync run is in progress SHALL NOT start a second run; it SHALL wait for the run in progress and answer with that run's outcome, whichever start the in-progress run came from.

#### Scenario: A second request joins the run in progress

- **WHEN** the control is used while a sync run is in progress
- **THEN** no second run starts and the request answers with the in-progress run's outcome

#### Scenario: A click during the nightly run

- **WHEN** the control is used while the nightly run is in progress
- **THEN** the nightly run continues, no second run starts, and the request answers with the nightly run's outcome

### Requirement: The screen reports what a started sync did

The system SHALL answer a screen-started sync request with the run's outcome once the run has finished, and the imports screen SHALL then refresh the log so the run appears. The screen SHALL show that the run is in progress until the request answers, and SHALL then show whether the run succeeded, failed, or was not configured. When the credentials are absent, the request SHALL start no run and record none.

#### Scenario: The screen waits for the answer

- **WHEN** the control is used
- **THEN** the screen shows that the run is in progress until the request answers, and starts no second request meanwhile

#### Scenario: A successful run is shown

- **WHEN** the run finishes successfully
- **THEN** the request answers with the success and the refreshed log shows the run

#### Scenario: A failed run is shown

- **WHEN** the run fails
- **THEN** the run is recorded as failed with its reason and the refreshed log shows it

#### Scenario: Absent credentials are reported

- **WHEN** the credentials are absent and the control is used
- **THEN** no login is attempted, no run is recorded, and the answer states that the sync is not configured
