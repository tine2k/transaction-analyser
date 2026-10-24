# Spec Delta

## MODIFIED Requirements

### Requirement: Each column maps to one `Transaction` data element

The system SHALL map the file's columns onto the `Transaction` aggregate as follows, and SHALL map no column onto any element other than the one named.

| File column | `Transaction` data element | Presence |
| --- | --- | --- |
| `Date` | Booking date | Required |
| `Value date` | Value date | Required |
| `Category` | none — discarded | — |
| `Name` | Counterparty name | Required |
| `Purpose` | Purpose line | Required |
| `Account` | Counterparty account | Optional |
| `Bank` | none — discarded | — |
| `Amount` | Amount | Required |
| `Currency` | none — discarded after validation | Required |

The run-time person SHALL map to the transaction's required Person reference. The person SHALL NOT be read from any file column; it SHALL be named when the import is run, and every row the run writes SHALL carry that same person. The system SHALL take the counterparty name from the `Name` column as the file gives it, and SHALL NOT read the counterparty name out of the `Purpose` column. The system SHALL NOT derive, split, trim, or rewrite any part of the purpose line in order to fill another element, and SHALL store the purpose line as that column's text. The system SHALL take the counterparty account from the `Account` column as the file gives it, and SHALL store an empty `Account` as an absent counterparty account rather than as an empty identifier. The system SHALL NOT map `Account` or `Bank` onto the person, and SHALL NOT validate the text of the counterparty account, which the domain model leaves unvalidated.

#### Scenario: A card payment is mapped to the aggregate

- **WHEN** a row reads `Date` `25.09.2026`, `Value date` `25.09.2026`, `Category` empty, `Name` `Bezahlung Karte MC/000010917HEURIGENBUFF`, `Purpose` `2360 D002 25.09. 19:44HEURIGENBUFFET SANDRA\PERCHTO, Transaction type: Payment`, `Account` empty, `Bank` empty, `Amount` `-33,61`, `Currency` `EUR`
- **THEN** the stored transaction holds booking date 2026-09-25, value date 2026-09-25, amount -33.61, purpose that exact text including its comma and backslash, counterparty name `Bezahlung Karte MC/000010917HEURIGENBUFF`, the run's person, and an absent counterparty account

#### Scenario: The merchant inside the purpose is not moved elsewhere

- **WHEN** a purpose line contains the merchant name and a trailing `Transaction type: Payment` clause
- **THEN** both remain in the stored purpose line, and neither appears in the counterparty name, the person, or any other element

#### Scenario: A populated account is stored as the counterparty account

- **WHEN** a row's `Account` field holds `DE89370400440532013000`
- **THEN** the stored transaction's counterparty account is that string, unvalidated and unaltered, and the person is still the run's person

#### Scenario: An empty account means an absent counterparty account

- **WHEN** a row's `Account` field is empty
- **THEN** the stored transaction has no counterparty account, rather than one that reads as an empty string

#### Scenario: The Account column is not the person

- **WHEN** a row's `Account` field names a bank account and the run names a person
- **THEN** the account is stored only as the counterparty account and the row's person is the run's person

### Requirement: Only rows that are not already stored are imported

The system SHALL import a row only when the table does not already hold a transaction with the same booking date, value date, amount, purpose, counterparty name, counterparty account, and person. When a file holds a row more often than the table does for the run's person, the import SHALL write only the surplus of the file's count over the stored count for that person, so that a statement that legitimately holds the same transaction twice still produces two rows, and a repeated import of an already stored file writes none. A row stored for another person SHALL NOT count as already stored for the run's person. The system SHALL report the number of data rows read, the number already stored, and the number written. The system SHALL NOT update or delete a stored transaction, and SHALL NOT refuse a run because the table already holds rows.

#### Scenario: A first import writes every row

- **WHEN** the file's rows are all absent from the table for the run's person
- **THEN** every row of the file is written, and the run reports every row as written

#### Scenario: Two identical rows in one file are both written

- **WHEN** a file holds two rows with the same date, amount, purpose, counterparty, and person and the table holds neither
- **THEN** two transactions are written, because the file states the transaction twice

#### Scenario: A second run of the same file writes nothing

- **WHEN** the import is run a second time on the same file for the same person
- **THEN** every row is reported as already stored, no transaction is written, and the run does not refuse

#### Scenario: The same rows for another person are new

- **WHEN** a file is imported for a second person and the table already holds every row for the first person
- **THEN** every row is written for the second person, because a row stored for one person is not stored for another

#### Scenario: A genuine duplicate is preserved when one copy is stored

- **WHEN** a file holds two identical rows for a person and the table already holds one of them for that person
- **THEN** exactly one new transaction is written, so that the table holds two for that person

#### Scenario: A stored transaction is not changed

- **WHEN** an import runs against a table that already holds transactions
- **THEN** every stored transaction keeps the values it had, and the import deletes and updates none of them

#### Scenario: The counts match the file

- **WHEN** an import completes successfully
- **THEN** the number of rows reported as read equals the number of data rows the file held, and the rows reported as written plus the rows reported as already stored equal that read count

## ADDED Requirements

### Requirement: The import requires an existing person named at run time

The system SHALL require the person to be named when the CSV import is run, and SHALL trim that
name before using it. It SHALL resolve the person against the stored people ignoring letter case,
and the person SHALL already exist; an unknown person SHALL be reported as an error before any row is
written, and the import SHALL NOT create a person. Every row the run writes SHALL carry the resolved
person, and the run SHALL report which person it imported into.

#### Scenario: The person is required

- **WHEN** the CSV import is run without a person
- **THEN** the run reports that a person is required and writes no row

#### Scenario: An unknown person fails before writing

- **WHEN** the run names a person that no stored person carries
- **THEN** the run reports the unknown person, creates no person, and writes no row

#### Scenario: The person name is looked up ignoring case

- **WHEN** a person is stored as `Anna` and the run names `anna`
- **THEN** the run resolves the stored `Anna` and imports into that person

#### Scenario: No person is created by an import

- **WHEN** the run names a person that does not exist
- **THEN** no person is created, so the people list is unchanged

#### Scenario: Every written row shares the run's person

- **WHEN** a run writes several rows for one person
- **THEN** every written row references that same person, and no row carries a different person

#### Scenario: A dry run classifies against the person

- **WHEN** a non-writing run names a valid person and the table already holds rows for that person
- **THEN** the run reports which of that person's rows are already stored and which would be written, and writes nothing

#### Scenario: A dry run with an unknown person writes nothing

- **WHEN** a non-writing run names a person that does not exist
- **THEN** the run reports the unknown person and writes nothing
