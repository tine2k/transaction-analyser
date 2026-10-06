# Spec Delta

## REMOVED Requirements

### Requirement: What the file states is what is stored, rows included

**Reason**: The import is no longer a faithful append of the file. A nightly sync runs against a table that already holds earlier runs, so a row already stored must be skipped rather than imported again; the guarantees that every row of the file is written and that a second run adds a second copy no longer hold.

**Migration**: No stored data and no schema change. Rows already imported stay as they are, and the replacement requirement preserves the count reporting and the guarantee that no stored row is updated or deleted.

## MODIFIED Requirements

### Requirement: The whole import is a single unit that either lands or does not

The system SHALL write the rows of one import as a single indivisible unit, so that a failure part-way through leaves no row of that import behind and no partially written file remains in the table. The system SHALL report the run as successful only when every row of the file has been accounted for — written, or reported as already stored — and SHALL NOT report success when a row was neither. The system SHALL NOT write a row in a state the schema forbids, and SHALL NOT require the caller to repair a partially imported file. The system SHALL NOT merge an import with earlier rows: a row written by this import is added to whatever the table already holds, and the import SHALL NOT delete, update, or overwrite any row that was not written by the same import.

#### Scenario: A failure during the write leaves no rows

- **WHEN** writing the import fails after some rows have been sent
- **THEN** the table holds none of that import's rows, exactly as it did before the run

#### Scenario: The run reports what it did

- **WHEN** an import completes successfully
- **THEN** the run reports the number of rows read from the file, the number already stored, the number written, and that every imported transaction is uncategorised

#### Scenario: A file whose rows are all stored is a success that writes nothing

- **WHEN** every row of the file is already stored
- **THEN** the run reports success, writes no row, and reports every row as already stored

#### Scenario: Earlier rows are left alone

- **WHEN** the table already holds transactions and the import writes more
- **THEN** the earlier transactions are unchanged, and the new rows are added alongside them

#### Scenario: A run reports failure when it did not finish

- **WHEN** the import does not account for every row
- **THEN** the run exits with a failure status, so that a caller can tell a completed import from an abandoned one

### Requirement: The import can be run without writing, and holds no credentials of its own

The system SHALL offer a mode in which it reads and validates the file, reports every row it would write and every row already stored, and writes nothing. That mode SHALL read the database to classify the rows, and SHALL leave every stored transaction unchanged. The system SHALL take the address of the database to import into as a parameter or from the environment, and SHALL NOT store a database address, user name, or password in the repository, in a committed file, or in the output it prints. The system SHALL NOT print any credential it was given. The system SHALL report a connection failure, naming the reason, as an error rather than as a successful import of nothing.

#### Scenario: A dry run reports without writing

- **WHEN** the import is run in its non-writing mode on a valid file
- **THEN** the rows that would be written and the rows already stored are reported, and the table is unchanged

#### Scenario: A dry run still reports invalid rows

- **WHEN** the import is run in its non-writing mode on a file holding an invalid row
- **THEN** the invalid row is reported, and nothing is written

#### Scenario: A dry run classifies rows against the database

- **WHEN** the import is run in its non-writing mode against a table that already holds some of the file's rows
- **THEN** the run reports which rows are new and which are already stored, and writes nothing

#### Scenario: The database address is not committed

- **WHEN** the import is configured to reach a database
- **THEN** the address and its credentials come from the run's arguments or the environment, and no file in the repository holds them

#### Scenario: Credentials are not echoed

- **WHEN** the import connects successfully or fails
- **THEN** no password or connection string it was given appears in the output it prints

#### Scenario: A connection failure is an error

- **WHEN** the database cannot be reached
- **THEN** the run reports the reason and exits with a failure status, and writes no row

## ADDED Requirements

### Requirement: Only rows that are not already stored are imported

The system SHALL import a row only when the table does not already hold a transaction with the same booking date, value date, amount, purpose, counterparty name, and counterparty account. When a file holds a row more often than the table does, the import SHALL write only the surplus of the file's count over the stored count, so that a statement that legitimately holds the same transaction twice still produces two rows, and a repeated import of an already stored file writes none. The system SHALL report the number of data rows read, the number already stored, and the number written. The system SHALL NOT update or delete a stored transaction, and SHALL NOT refuse a run because the table already holds rows.

#### Scenario: A first import writes every row

- **WHEN** the file's rows are all absent from the table
- **THEN** every row of the file is written, and the run reports every row as written

#### Scenario: Two identical rows in one file are both written

- **WHEN** a file holds two rows with the same date, amount, purpose, and counterparty and the table holds neither
- **THEN** two transactions are written, because the file states the transaction twice

#### Scenario: A second run of the same file writes nothing

- **WHEN** the import is run a second time on the same file
- **THEN** every row is reported as already stored, no transaction is written, and the run does not refuse

#### Scenario: A genuine duplicate is preserved when one copy is stored

- **WHEN** a file holds two identical rows and the table already holds one of them
- **THEN** exactly one new transaction is written, so that the table holds two

#### Scenario: A stored transaction is not changed

- **WHEN** an import runs against a table that already holds transactions
- **THEN** every stored transaction keeps the values it had, and the import deletes and updates none of them

#### Scenario: The counts match the file

- **WHEN** an import completes successfully
- **THEN** the number of rows reported as read equals the number of data rows the file held, and the rows reported as written plus the rows reported as already stored equal that read count
