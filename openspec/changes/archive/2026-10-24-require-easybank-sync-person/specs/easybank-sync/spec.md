# Spec Delta

## ADDED Requirements

### Requirement: The sync person is required at startup and by the sync command

The server SHALL fail startup with a non-zero exit and serve no request when `EASYBANK_PERSON` is
missing, empty, or whitespace-only, and the message SHALL name the variable without including a
credential. The manual sync command SHALL exit non-zero before logging in, reading the bank, or
opening the database when the variable is unusable. Its help option SHALL still work without the
variable. There SHALL be no default person.

#### Scenario: Startup without the variable fails

- **WHEN** the server is started with no `EASYBANK_PERSON` in the environment
- **THEN** the process exits non-zero before serving any request, and the message names the missing variable

#### Scenario: Startup with an empty variable fails

- **WHEN** the server is started with `EASYBANK_PERSON` set to an empty value or only whitespace
- **THEN** the process exits non-zero and serves no request

#### Scenario: The sync command refuses before contacting the bank

- **WHEN** the manual sync command runs without a usable `EASYBANK_PERSON`
- **THEN** it exits non-zero before logging in, reading the bank, or opening the database, and the message names the missing variable

#### Scenario: The sync command still shows its help

- **WHEN** the manual sync command is asked for help without a usable `EASYBANK_PERSON`
- **THEN** it prints its usage and exits zero without requiring the variable

### Requirement: The sync resolves its configured person for every run

The sync SHALL read its person from `EASYBANK_PERSON` at run time, trim the name, and resolve it
against stored people ignoring letter case. It SHALL require that the person exists and SHALL NOT
create one. Every retrieved row SHALL be imported into that one person for the nightly, manual, and
screen-started runs. A run that cannot resolve its person SHALL be recorded as failed, write no
transaction, and leave the server serving.

#### Scenario: A configured person is used

- **WHEN** the sync runs with `EASYBANK_PERSON` naming an existing person
- **THEN** every retrieved row the run writes references that person

#### Scenario: The person name is resolved ignoring case

- **WHEN** `EASYBANK_PERSON` names `anna` and a person is stored as `Anna`
- **THEN** the sync imports into the stored `Anna`

#### Scenario: Every retrieved row shares the person

- **WHEN** a sync run writes several retrieved rows
- **THEN** every written row references the same configured person

#### Scenario: An unknown person fails the run

- **WHEN** the sync cannot resolve the configured person
- **THEN** the run is recorded as failed with the reason, creates no person, and writes no transaction

#### Scenario: The manual command uses the same person

- **WHEN** the manual sync command runs
- **THEN** it resolves and imports into the same configured person the nightly run uses

#### Scenario: The screen-started sync uses the same person

- **WHEN** the sync is started from the imports screen
- **THEN** it resolves and imports into the same configured person the nightly run uses

#### Scenario: The run records its person

- **WHEN** a sync run resolves its person and finishes, successfully or not
- **THEN** the recorded run names that person

#### Scenario: No person is created by the sync

- **WHEN** the sync cannot resolve its configured person
- **THEN** no person is created, so the people list is unchanged

## REMOVED Requirements

### Requirement: The sync imports into one configured person

**Reason**: Replaced by "The sync person is required at startup and by the sync command" and "The sync
imports into one configured person". The earlier requirement defaulted an absent or empty
`EASYBANK_PERSON` to the seeded person `Default`, so a deployment that forgot the variable silently
imported into that person or failed after a rename. The person a run writes to is now a required
configuration, and its absence stops the server and the sync command instead of selecting a default.

**Migration**: Set `EASYBANK_PERSON` in the server environment and in the environment of the manual
sync command before deploying or running a sync. Read the person name on the People screen and use
it; a fresh installation can use `Default` until the person is renamed. A server started without the
variable exits non-zero and names it.
