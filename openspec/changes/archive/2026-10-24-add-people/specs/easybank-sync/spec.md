# Spec Delta

## ADDED Requirements

### Requirement: The sync imports into one configured person

The sync SHALL read its person from `EASYBANK_PERSON` at run time, defaulting to `Default` when the
variable is absent or empty. It SHALL trim the name, resolve it against stored people ignoring letter
case, and require that the person exists; it SHALL NOT create one. Every retrieved row SHALL be
imported into that one person for the nightly, manual, and screen-started runs. A run that cannot
resolve its person SHALL be recorded as failed, write no transaction, and leave the server serving.

#### Scenario: Default is used when no person is configured

- **WHEN** the sync runs with `EASYBANK_PERSON` absent or empty and a person named `Default` exists
- **THEN** the retrieved rows are imported into `Default`

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

#### Scenario: A renamed Default fails loudly until configured

- **WHEN** the person named `Default` has been renamed and `EASYBANK_PERSON` is still absent
- **THEN** the sync fails to resolve `Default`, records a failed run, and writes no transaction

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
