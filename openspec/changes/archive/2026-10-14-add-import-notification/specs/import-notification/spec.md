# Spec Delta

## Purpose

Tells the operator, without opening the application, when a sync has imported new transactions that no stored category matched, so the transactions can be categorised.

## ADDED Requirements

### Requirement: A sync that writes new transactions without a category sends one notification

After a sync run finishes, the system SHALL send one Pushover notification when the run wrote at least one new transaction and at least one written transaction received no category. It SHALL send none when the run wrote no transaction, when every written transaction received a category, when the run was non-writing, or when the run failed.

#### Scenario: A mixed run notifies

- **WHEN** a sync writes six transactions of which four receive a category
- **THEN** one notification is sent for the run

#### Scenario: A fully categorised run stays silent

- **WHEN** a sync writes transactions and every one of them receives a category
- **THEN** no notification is sent

#### Scenario: A run that wrote nothing stays silent

- **WHEN** a sync finds every retrieved row already stored and writes none
- **THEN** no notification is sent

#### Scenario: A non-writing run stays silent

- **WHEN** a sync runs non-writing
- **THEN** no notification is sent, even though rows would have been written

#### Scenario: A failed run stays silent

- **WHEN** a sync fails before writing anything
- **THEN** no notification is sent

### Requirement: The notification carries the run's summary

The notification SHALL carry the run's summary: the number of new transactions written, the number of them that received a category, and the number written without a category. It SHALL carry those counts only, and SHALL NOT carry transaction details such as a counterparty, a purpose, or an amount.

#### Scenario: The counts are the run's own

- **WHEN** a sync writes six transactions of which four receive a category
- **THEN** the notification states six written, four categorised, and two without a category

#### Scenario: No transaction details are carried

- **WHEN** a sync writes uncategorised transactions
- **THEN** the notification names no counterparty, no purpose, and no amount

### Requirement: Every sync path notifies, and the CSV import does not

The system SHALL send the notification for the nightly scheduled sync, the manual sync command, and the sync started from the imports screen, because all three run the same sync path. The manual CSV import SHALL NOT send a notification.

#### Scenario: The nightly run notifies

- **WHEN** the scheduled sync writes uncategorised transactions
- **THEN** it sends the notification

#### Scenario: The manual sync command notifies

- **WHEN** the manual sync command runs writing and writes an uncategorised transaction
- **THEN** it sends the notification

#### Scenario: The screen-started sync notifies

- **WHEN** the sync started from the imports screen writes an uncategorised transaction
- **THEN** it sends the notification

#### Scenario: The CSV import stays silent

- **WHEN** the manual CSV import writes an uncategorised transaction
- **THEN** it sends no notification

### Requirement: The credentials come from the environment and are never disclosed

The system SHALL read the Pushover application token and recipient key from the process environment at run time, and SHALL NOT require them in a committed file. Neither value SHALL appear in a response, a log line, a recorded run, or a delivered message. When either is absent, the system SHALL send no notification and SHALL NOT fail the run for it.

#### Scenario: Unset credentials send nothing and fail nothing

- **WHEN** the credentials are absent and a sync writes uncategorised transactions
- **THEN** no notification is attempted and the run is recorded as the success it was

#### Scenario: A failed notification discloses nothing

- **WHEN** the notification fails and its reason is logged
- **THEN** the reason names no token and no key

#### Scenario: The delivered message carries no credential

- **WHEN** a notification message is delivered
- **THEN** the message contains no token and no key

### Requirement: A notification failure never affects the import

A notification that cannot be sent SHALL NOT fail the sync, change its outcome, change its run record, or change any stored transaction. The system SHALL log the failure and SHALL leave the run reading as the same outcome it would have read as had the notification succeeded.

#### Scenario: A refused notification leaves the run a success

- **WHEN** Pushover answers with an error and the sync wrote its rows
- **THEN** the run record still reads success with its counts, and the written rows stay stored

#### Scenario: An unreachable Pushover leaves the run a success

- **WHEN** Pushover cannot be reached and the sync wrote its rows
- **THEN** the run record still reads success with its counts, and the written rows stay stored

#### Scenario: The command reports the sync, not the notification

- **WHEN** the manual sync command runs and the notification fails
- **THEN** the command reports the sync's outcome, not the notification's failure

### Requirement: The notification is attempted after the run is recorded, within a bound

The system SHALL finish the run's record before it attempts the notification, so no notification describes a run whose record is not final. The attempt SHALL be bounded in time, so a Pushover server that never answers cannot leave the run unfinished or hold a screen-started sync's answer.

#### Scenario: The record is final first

- **WHEN** a sync sends its notification
- **THEN** the run's record already reads its finished outcome

#### Scenario: A hung server does not hang the run

- **WHEN** Pushover never answers
- **THEN** the attempt ends within its bound and the run's record is finished

#### Scenario: The screen still answers

- **WHEN** the screen-started sync's notification attempt ends by its bound
- **THEN** the screen's request answers with the run's outcome
