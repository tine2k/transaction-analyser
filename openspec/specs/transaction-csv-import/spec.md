# Transaction CSV Import Specification

## Purpose

Defines how transactions are imported into the database from the bank export's semicolon-delimited CSV: the shape of that file, the mapping from its columns onto the `Transaction` aggregate, the number and date formats it writes in, and the guarantee that a run either imports a whole file or changes nothing.

## Requirements

### Requirement: The import source is a file named at run time, and it is not part of the repository

The system SHALL take the path to the CSV to import as a parameter given when the import is run, and SHALL read that file from the filesystem at that path. The file SHALL NOT be committed to the repository, SHALL NOT be copied into the repository by the import, and SHALL NOT be required to live inside the repository's working tree. The system SHALL NOT ship, generate, or store a statement file of its own. A path that names no readable file SHALL be reported as an error and no row SHALL be written.

#### Scenario: The file is read from the path given at run time

- **WHEN** the import is run with a path to a readable CSV file
- **THEN** that file is the sole source of the imported rows, and no statement file is read from the repository or from any other location

#### Scenario: The statement file stays outside the repository

- **WHEN** an import completes successfully
- **THEN** no CSV file has been added to the repository's working tree, and the imported rows exist only in the database

#### Scenario: A CSV file is excluded from version control

- **WHEN** a CSV file is present anywhere in the working tree
- **THEN** version control is configured to ignore it, so the statement cannot be committed even if it is created there by accident

#### Scenario: A missing file is an error

- **WHEN** the import is run with a path that names no readable file
- **THEN** the run reports that path and the reason it could not be read, and writes no row

### Requirement: The file is a semicolon-delimited CSV with a nine-column header

The system SHALL read the file as CSV with `;` as the field delimiter, and SHALL expect its first line to be a header naming exactly these nine columns in this order: `Date`, `Value date`, `Category`, `Name`, `Purpose`, `Account`, `Bank`, `Amount`, `Currency`. The system SHALL match data rows to the header by position. The system SHALL support RFC 4180 quoting, so a field MAY be wrapped in double quotes and MAY then contain the delimiter, a double quote escaped by doubling, or a line break. A file whose first line is not that header SHALL be rejected before any row is written, and SHALL be reported as a file the import does not recognise rather than as a row error. A field MAY carry surrounding whitespace, and the system SHALL strip it before the value is used. A line that is empty or holds only whitespace SHALL be skipped rather than reported as an invalid row. The file SHALL be read as UTF-8.

#### Scenario: A conforming file is accepted

- **WHEN** the import is run on a file whose first line names those nine columns in that order and whose following lines each carry nine semicolon-separated fields
- **THEN** every data line is read as one row and matched to the nine columns by position

#### Scenario: A quoted field may contain the delimiter

- **WHEN** a purpose line contains a semicolon or a comma and is wrapped in double quotes in the file
- **THEN** the whole quoted text, delimiter included, is that row's purpose line

#### Scenario: Surrounding whitespace is stripped

- **WHEN** the `Currency` field is written as `EUR ` with a trailing space
- **THEN** the value used is `EUR`, without the trailing space

#### Scenario: Blank lines are skipped

- **WHEN** the file contains a line that is empty or holds only whitespace between data rows
- **THEN** that line produces no row and is not reported as an error

#### Scenario: A different header is rejected before any write

- **WHEN** the file's first line names a different column, a different number of columns, or a different column order
- **THEN** the run reports that the header is not the one it recognises, names no individual row, and writes no row

#### Scenario: A file that is not valid UTF-8 is an error

- **WHEN** the file contains byte sequences that are not valid UTF-8
- **THEN** the run reports the encoding as the reason and writes no row, rather than storing corrupted characters

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

The system SHALL take the counterparty name from the `Name` column as the file gives it, and SHALL NOT read the counterparty name out of the `Purpose` column. The system SHALL NOT derive, split, trim, or rewrite any part of the purpose line in order to fill another element, and SHALL store the purpose line as that column's text. The system SHALL take the counterparty account from the `Account` column as the file gives it, and SHALL store an empty `Account` as an absent counterparty account rather than as an empty identifier. The system SHALL NOT map `Bank` onto any element, and SHALL NOT validate the text of the counterparty account, which the domain model leaves unvalidated.

#### Scenario: A card payment is mapped to the aggregate

- **WHEN** a row reads `Date` `25.09.2026`, `Value date` `25.09.2026`, `Category` empty, `Name` `Bezahlung Karte MC/000010917HEURIGENBUFF`, `Purpose` `2360 D002 25.09. 19:44HEURIGENBUFFET SANDRA\PERCHTO, Transaction type: Payment`, `Account` empty, `Bank` empty, `Amount` `-33,61`, `Currency` `EUR`
- **THEN** the stored transaction holds booking date 2026-09-25, value date 2026-09-25, amount -33.61, purpose that exact text including its comma and backslash, counterparty name `Bezahlung Karte MC/000010917HEURIGENBUFF`, and an absent counterparty account

#### Scenario: The merchant inside the purpose is not moved elsewhere

- **WHEN** a purpose line contains the merchant name and a trailing `Transaction type: Payment` clause
- **THEN** both remain in the stored purpose line, and neither appears in the counterparty name or in any other element

#### Scenario: A populated account is stored as the counterparty account

- **WHEN** a row's `Account` field holds `DE89370400440532013000`
- **THEN** the stored transaction's counterparty account is that string, unvalidated and unaltered

#### Scenario: An empty account means an absent counterparty account

- **WHEN** a row's `Account` field is empty
- **THEN** the stored transaction has no counterparty account, rather than one that reads as an empty string

### Requirement: Dates are read as day, month, year and stored as calendar dates

The system SHALL read both date columns in the file's `DD.MM.YYYY` form, with a two-digit day and month and a four-digit year, and SHALL store each as a calendar date with no time of day. The system SHALL read the two date columns independently and SHALL NOT require them to be equal, and SHALL NOT reject a value date that falls before the booking date. A value that is not two digits, a dot, two digits, a dot, four digits SHALL be reported as an invalid row, and so SHALL a value whose day, month, or year does not exist on the calendar, such as `31.02.2026`.

#### Scenario: A day-first date becomes a calendar date

- **WHEN** a `Date` field reads `25.09.2026`
- **THEN** the stored booking date is 2026-09-25, with no time of day

#### Scenario: The two dates are read independently

- **WHEN** a row's `Date` reads `02.03.2026` and its `Value date` reads `01.03.2026`
- **THEN** the booking date is stored as 2026-03-02 and the value date as 2026-03-01, and the row is accepted

#### Scenario: A date that does not exist is rejected

- **WHEN** a date field reads `31.02.2026`
- **THEN** that row is reported as invalid and no transaction is stored for it

#### Scenario: A date in any other order is rejected

- **WHEN** a date field reads `2026-09-25`
- **THEN** that row is reported as invalid, and the run states that the expected order is day, month, year

### Requirement: Amounts are read in the file's number format and stored exactly

The system SHALL read the `Amount` column as a number written with a comma as the decimal separator, which MAY be preceded by a minus sign and MAY use a period as a thousands separator, and SHALL store the value with the sign it carries, so that a positive amount is money in and a negative amount is money out. The stored amount SHALL read back as exactly the value the file states, with no rounding, truncation, or approximation. The system SHALL NOT store a zero amount, because a zero carries no direction, and SHALL report a zero amount as an invalid row rather than relying on the database to reject it. A value that is not a number in this format SHALL be reported as an invalid row. The system SHALL NOT store any value in the amount that the file did not state.

#### Scenario: A comma decimal separator is read as a fraction

- **WHEN** the `Amount` field reads `-33,61`
- **THEN** the stored amount is exactly -33.61, reading as 33.61 EUR of money out

#### Scenario: A positive amount is money in

- **WHEN** the `Amount` field reads `250,00`
- **THEN** the stored amount is exactly 250.00, reading as 250.00 EUR of money in

#### Scenario: A thousands separator is removed, not kept

- **WHEN** the `Amount` field reads `-1.234,56`
- **THEN** the stored amount is exactly -1234.56

#### Scenario: A two-decimal amount keeps its precision

- **WHEN** the `Amount` field reads `0,01`
- **THEN** the stored amount reads back as exactly 0.01, with no floating-point approximation

#### Scenario: A zero amount is rejected before any write

- **WHEN** the `Amount` field reads `0,00`
- **THEN** that row is reported as invalid, naming the zero amount as the reason

#### Scenario: Text in the amount column is rejected

- **WHEN** the `Amount` field reads `-33.61 EUR` or `abc`
- **THEN** that row is reported as invalid

### Requirement: Only EUR is accepted

The system SHALL read the `Currency` column and SHALL accept a row only when it names `EUR`, and SHALL discard that column rather than storing it, because the amount is denominated in EUR by the domain model and no other currency is representable on a transaction. A row whose `Currency` names any other value SHALL be reported as an invalid row, naming the currency that was found, and no transaction SHALL be stored for it. The system SHALL NOT convert an amount in another currency, and SHALL NOT import a foreign-currency amount as though it were an EUR amount.

#### Scenario: A EUR row is accepted and the column is discarded

- **WHEN** the `Currency` field reads `EUR`
- **THEN** the row is accepted, and the stored transaction carries no currency of its own and expresses the amount in EUR

#### Scenario: A non-EUR row is rejected

- **WHEN** the `Currency` field reads `USD` or `CHF`
- **THEN** that row is reported as invalid, naming `USD` or `CHF` as the currency found, and no transaction is stored for it

#### Scenario: A missing currency is rejected

- **WHEN** the `Currency` field is empty
- **THEN** that row is reported as invalid, because the file does not state that the amount is in EUR

### Requirement: Every imported transaction is uncategorised

The system SHALL store every imported row with no category, and SHALL NOT create a row in `categories`, SHALL NOT evaluate any category's regular expression, and SHALL NOT assign a category to any imported transaction. The file's own `Category` column SHALL be read and discarded, because that column is the bank's own classification rather than a `Category` of this system, and importing it would apply a rule the domain model has not decided. Every row written by the import SHALL therefore read as uncategorised.

#### Scenario: An import writes no category

- **WHEN** an import completes successfully
- **THEN** every transaction it wrote has no category, and no category was created for the import

#### Scenario: The bank's category column does not categorise anything

- **WHEN** a row's `Category` field holds a non-empty value such as `Gastro`
- **THEN** that value is discarded, and the stored transaction is still uncategorised

#### Scenario: An existing category is not applied

- **WHEN** the `categories` table already holds categories whose regular expressions match the purpose lines of the rows being imported
- **THEN** none of the imported transactions is assigned any of them, because this import does not evaluate patterns

### Requirement: Every row is validated before anything is written, and a failure writes nothing

The system SHALL read and validate the whole file before it writes any row, and SHALL report every invalid row it found rather than stopping at the first. If at least one row is invalid, the system SHALL write no row at all and SHALL say so, so that a run either imports the entire file or leaves the table exactly as it was. A partially imported file SHALL NOT be a state the import can produce. The system SHALL treat a row as invalid when a required field is empty after whitespace is stripped, when a value does not match the format its column requires, when a field count does not match the header, or when a value the schema forbids is present. The system SHALL reject a row whose `Purpose` or `Name` is empty after trimming, even though the stored row would accept an empty string, because at the file level an empty required field is a row the export has lost rather than a value the transaction carries. The system SHALL report each invalid row with its line number in the file, counting the header as line 1 and counting every line break, and with the reason it was rejected.

#### Scenario: A clean file is written in full

- **WHEN** every row of the file is valid
- **THEN** every row of the file is written, and the run reports how many rows it wrote

#### Scenario: One bad row prevents the whole import

- **WHEN** a file of one hundred rows holds ninety-nine valid rows and one row with an unparseable amount
- **THEN** no row is written, and the run reports the invalid row and that nothing was written

#### Scenario: Every invalid row is reported, not just the first

- **WHEN** a file holds five rows that are each invalid for a different reason
- **THEN** all five are reported, each with its own line number and reason

#### Scenario: An empty required field is an invalid row

- **WHEN** a row's `Name` field is empty after whitespace is stripped
- **THEN** that row is reported as invalid and no transaction is stored for it

#### Scenario: A row with the wrong number of fields is invalid

- **WHEN** a data line carries eight or ten fields where the header names nine
- **THEN** that row is reported as invalid, naming the field count that was found

#### Scenario: A reported line number locates the row

- **WHEN** a row is reported as invalid
- **THEN** the report gives a line number that counts the header as line 1, so that opening the file at that line reaches the offending row

#### Scenario: A file with no data rows imports nothing

- **WHEN** the file holds the header and no data row
- **THEN** the run reports that the file holds no transaction, writes no row, and does not report an error

### Requirement: The whole import is a single unit that either lands or does not

The system SHALL write the rows of one import as a single indivisible unit, so that a failure part-way through leaves no row of that import behind and no partially written file remains in the table. The system SHALL report the run as successful only when every row of the file has been written. The system SHALL NOT write a row in a state the schema forbids, and SHALL NOT require the caller to repair a partially imported file. The system SHALL NOT merge an import with earlier rows: a row written by this import is added to whatever the table already holds, and the import SHALL NOT delete, update, or overwrite any row that was not written by the same import.

#### Scenario: A failure during the write leaves no rows

- **WHEN** writing the import fails after some rows have been sent
- **THEN** the table holds none of that import's rows, exactly as it did before the run

#### Scenario: The run reports what it did

- **WHEN** an import completes successfully
- **THEN** the run reports the number of rows read from the file, the number written, and that every imported transaction is uncategorised

#### Scenario: Earlier rows are left alone

- **WHEN** the table already holds transactions and the import writes more
- **THEN** the earlier transactions are unchanged, and the new rows are added alongside them

#### Scenario: A run reports failure when it did not finish

- **WHEN** the import does not complete every row
- **THEN** the run exits with a failure status, so that a caller can tell a completed import from an abandoned one

### Requirement: The import can be run without writing, and holds no credentials of its own

The system SHALL offer a mode in which it reads and validates the file, reports what it found and what it would write, and writes nothing and connects to no database. The system SHALL take the address of the database to import into as a parameter or from the environment, and SHALL NOT store a database address, user name, or password in the repository, in a committed file, or in the output it prints. The system SHALL NOT print any credential it was given. The system SHALL report a connection failure, naming the reason, as an error rather than as a successful import of nothing.

#### Scenario: A dry run reports without writing

- **WHEN** the import is run in its non-writing mode on a valid file
- **THEN** the rows that would be written are reported, and the table is unchanged and no connection to a database is opened

#### Scenario: A dry run still reports invalid rows

- **WHEN** the import is run in its non-writing mode on a file holding an invalid row
- **THEN** the invalid row is reported, and nothing is written

#### Scenario: The database address is not committed

- **WHEN** the import is configured to reach a database
- **THEN** the address and its credentials come from the run's arguments or the environment, and no file in the repository holds them

#### Scenario: Credentials are not echoed

- **WHEN** the import connects successfully or fails
- **THEN** no password or connection string it was given appears in the output it prints

#### Scenario: A connection failure is an error

- **WHEN** the database cannot be reached
- **THEN** the run reports the reason and exits with a failure status, and writes no row

### Requirement: What the file states is what is stored, rows included

The system SHALL import the file's rows as they are given, and SHALL NOT merge two rows that describe the same transaction, SHALL NOT collapse rows that share a date and an amount, and SHALL NOT discard a row as a duplicate. A statement that legitimately contains the same transaction twice SHALL therefore produce two rows, and the import SHALL report the number of rows it wrote so that the count can be checked against the file. The system SHALL NOT detect that the file has already been imported, and SHALL NOT refuse a run because the table already holds rows.

#### Scenario: Two identical rows are both written

- **WHEN** a file holds two rows with the same date, amount, purpose, and counterparty
- **THEN** two transactions are written, because the table holds no key that would make them one transaction

#### Scenario: A second run adds the statement again

- **WHEN** the import is run a second time on the same file
- **THEN** a second copy of every row is added, and the run reports the count it wrote rather than refusing

#### Scenario: The written count matches the file

- **WHEN** an import completes successfully
- **THEN** the number of rows reported as written equals the number of data rows the file held

