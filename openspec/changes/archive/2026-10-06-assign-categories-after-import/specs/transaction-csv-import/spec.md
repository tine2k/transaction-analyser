# Spec Delta

## REMOVED Requirements

### Requirement: Every imported transaction is uncategorised

**Reason**: The import now evaluates each row it writes against the stored categories and stores the winning category, so the guarantee that every imported transaction is uncategorised no longer holds. The file's own `Category` column is still discarded; the bank's classification is not what decides the category.

**Migration**: No schema or data change. Rows imported before this change keep the null category they hold; the next category create, edit, or delete already re-evaluates every transaction. Imports after this change categorise their new rows as they are written.

## MODIFIED Requirements

### Requirement: The whole import is a single unit that either lands or does not

The system SHALL write the rows of one import, and assign the categories those rows receive, as a single indivisible unit, so that a failure part-way through leaves no row of that import behind, no category assigned by that import, and no partially written file remains in the table. The system SHALL report the run as successful only when every row of the file has been accounted for — written, or reported as already stored — and SHALL NOT report success when a row was neither. The system SHALL NOT write a row in a state the schema forbids, and SHALL NOT require the caller to repair a partially imported file. The system SHALL NOT merge an import with earlier rows: a row written by this import is added to whatever the table already holds, and the import SHALL NOT delete, update, or overwrite any row that was not written by the same import.

#### Scenario: A failure during the write leaves no rows

- **WHEN** writing the import fails after some rows have been sent
- **THEN** the table holds none of that import's rows and none of their categories, exactly as it did before the run

#### Scenario: The run reports what it did

- **WHEN** an import completes successfully
- **THEN** the run reports the number of rows read from the file, the number already stored, the number written, and the number of newly written rows that received a category

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

The system SHALL offer a mode in which it reads and validates the file, reports every row it would write and every row already stored, writes nothing, and assigns no category. That mode SHALL read the database to classify the rows, and SHALL leave every stored transaction and every stored category unchanged. The system SHALL take the address of the database to import into as a parameter or from the environment, and SHALL NOT store a database address, user name, or password in the repository, in a committed file, or in the output it prints. The system SHALL NOT print any credential it was given. The system SHALL report a connection failure, naming the reason, as an error rather than as a successful import of nothing.

#### Scenario: A dry run reports without writing

- **WHEN** the import is run in its non-writing mode on a valid file
- **THEN** the rows that would be written and the rows already stored are reported, no category is assigned, and the table is unchanged

#### Scenario: A dry run still reports invalid rows

- **WHEN** the import is run in its non-writing mode on a file holding an invalid row
- **THEN** the invalid row is reported, and nothing is written

#### Scenario: A dry run classifies rows against the database

- **WHEN** the import is run in its non-writing mode against a table that already holds some of the file's rows
- **THEN** the run reports which rows are new and which are already stored, and writes nothing

#### Scenario: A dry run leaves every category reference as it was

- **WHEN** the import is run in its non-writing mode against a table holding categorised and uncategorised transactions
- **THEN** every transaction keeps the category it held and no assignment is made

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

### Requirement: Newly written rows are categorised by the stored categories

Each row the import writes SHALL be evaluated against the categories stored when the import runs and SHALL be stored with the category that wins the matching, or with none when no category matches, as `category-assignment` defines. The import SHALL NOT re-evaluate or change a row that was already stored. The file's own `Category` column SHALL still be read and discarded, and SHALL NOT decide any category.

#### Scenario: An imported row matching a stored category is categorised

- **WHEN** a row whose purpose line matches a stored category's expression is not already stored and the import writes it
- **THEN** the written transaction holds that category

#### Scenario: An imported row matching nothing stays uncategorised

- **WHEN** no stored category matches a row the import writes
- **THEN** the written transaction reads as uncategorised

#### Scenario: The bank's category column does not decide the category

- **WHEN** a row's `Category` field holds a non-empty value such as `Gastro` and no stored category matches its purpose line
- **THEN** the written transaction reads as uncategorised, because the file's column is discarded

#### Scenario: An import with no stored categories writes uncategorised rows

- **WHEN** the `categories` table holds no category and the import writes rows
- **THEN** every written transaction reads as uncategorised and the run still succeeds
