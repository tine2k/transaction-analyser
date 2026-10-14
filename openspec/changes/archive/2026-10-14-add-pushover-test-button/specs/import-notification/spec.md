# Spec Delta

## ADDED Requirements

### Requirement: The Pushover configuration can be tested from the imports screen

The imports screen SHALL carry a control that sends one test notification without starting an
import. The control SHALL make a same-origin request that sends the message through the same
Pushover request path, environment credentials, and time bound the import notification uses. The
control SHALL be disabled while its request is in flight, and it SHALL start no import and change
no stored data.

#### Scenario: A configured server sends the test message

- **WHEN** the control is used and the credentials are present
- **THEN** one message is sent through the import notification's Pushover request path, and the screen states that the message was sent

#### Scenario: An unconfigured server explains itself

- **WHEN** the control is used and the credentials are absent
- **THEN** no message is attempted and the screen states that the configuration is absent

#### Scenario: A refused test states the reason

- **WHEN** Pushover refuses the test message
- **THEN** the screen states that the test failed and names the reason

#### Scenario: A hung server does not hang the test

- **WHEN** Pushover never answers
- **THEN** the test ends within its bound and the screen states the failure

#### Scenario: A test in flight cannot be doubled

- **WHEN** a test request is in flight
- **THEN** the control is disabled and starts no second request

#### Scenario: The test starts no import and changes no stored data

- **WHEN** the control is used
- **THEN** no import run starts, no run record is written, and no stored transaction changes

#### Scenario: A shown failure reason discloses nothing

- **WHEN** the test fails and the screen shows its reason
- **THEN** the reason names no token and no key

### Requirement: The test message is a fixed text that discloses nothing

The test message SHALL identify itself as a test of the notification configuration and SHALL be
distinguishable from the summary a sync run's notification carries. It SHALL carry no transaction
detail and no credential.

#### Scenario: The message reads as a test

- **WHEN** the test message is delivered
- **THEN** it states that it is a test of the notification configuration

#### Scenario: No transaction detail is carried

- **WHEN** the test message is delivered
- **THEN** it names no counterparty, no purpose, and no amount

#### Scenario: No credential is carried

- **WHEN** the test message is delivered
- **THEN** the message contains no token and no key
