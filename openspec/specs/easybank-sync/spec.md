# easybank-sync Specification

## Purpose

Keeps the Easybank Giro account's transactions current: retrieves the account's transaction list on a nightly schedule and hands it to the transaction import, with credentials from the environment and a non-writing mode until writing is trusted.

## Requirements

### Requirement: The sync runs once a night, and a missed night is recovered by a later run

The system SHALL run the Easybank sync once per night while the server process runs, with no request involved. Two sync runs SHALL NOT overlap. A night the server was not running SHALL be recovered by a later run, whose retrieval window reaches back far enough to include the missed night's transactions.

#### Scenario: The nightly run happens without a request

- **WHEN** the server process runs through the configured nightly time
- **THEN** the sync starts on its own, with no request made to the application

#### Scenario: A missed night is recovered

- **WHEN** the server did not run on a night and runs again on a later night
- **THEN** that later run's window includes the transactions of the missed night, and they are imported then

#### Scenario: Two runs do not overlap

- **WHEN** a sync run is still in progress at the next scheduled time
- **THEN** no second run starts while the first is running

### Requirement: The sync covers the Giro account and only the Giro account

The sync SHALL retrieve the transactions of the Easybank Giro account only, and SHALL NOT retrieve the credit card account or any other account. The retrieved set SHALL be the bank's own transaction list for that account as its web banking presents it, and SHALL NOT be the CSV export, which the bank protects with strong customer authentication.

#### Scenario: The Giro list is retrieved

- **WHEN** the sync runs
- **THEN** the rows it imports are the Giro account's transactions as the bank's transaction list states them

#### Scenario: The credit card is not retrieved

- **WHEN** the sync runs for an account holder who also holds an Easybank credit card
- **THEN** no credit card transaction is retrieved or imported

### Requirement: The sync performs no action that needs strong customer authentication

The sync SHALL retrieve transactions using only the bank's login and transaction list. It SHALL NOT request the CSV export, SHALL NOT open the transaction search panel, and SHALL NOT request a statement or receipt, because each of those demands confirmation in the easybank app and would make an unattended run impossible.

#### Scenario: The login and list need no confirmation

- **WHEN** the sync logs in and opens the Giro account's transaction list
- **THEN** the bank answers without asking for a confirmation in the app

#### Scenario: No export or search is requested

- **WHEN** a sync run is inspected
- **THEN** it requested no CSV export, opened no search panel, and requested no statement, and every request it made was answered without strong customer authentication

### Requirement: The booking text is mapped to a counterparty and a purpose

The bank's list gives each transaction a booking text of one or more lines and no separate counterparty columns. The sync SHALL map that text as follows, and SHALL always produce a non-empty counterparty name and a non-empty purpose line. When a line holds an IBAN, the counterparty account SHALL be that IBAN, the counterparty name SHALL be the text after the IBAN on that line together with any later lines, and the purpose line SHALL be the lines before it, or the whole text when nothing precedes it. When no line holds an IBAN, the counterparty name SHALL be the first line, the purpose line the later lines, or the first line again when there are none, and the counterparty account SHALL be absent. When a line holds an IBAN but nothing follows it, the counterparty name SHALL be the whole booking text.

#### Scenario: A transfer with an IBAN

- **WHEN** the booking text is `Abbuchung Dauerauftrag` followed by a line holding an IBAN and a name
- **THEN** the counterparty account is that IBAN, the counterparty name is the text after it, and the purpose line is `Abbuchung Dauerauftrag`

#### Scenario: A card payment without an IBAN

- **WHEN** the booking text has no IBAN and reads `Bezahlung Karte` on its first line and merchant details on the later lines
- **THEN** the counterparty name is `Bezahlung Karte`, the purpose line is the later lines, and no counterparty account is stored

#### Scenario: A single-line booking text

- **WHEN** the booking text is one line with no IBAN
- **THEN** that line is both the counterparty name and the purpose line, so neither is empty

#### Scenario: An IBAN on the first line

- **WHEN** the first line of the booking text holds the IBAN
- **THEN** the purpose line is the whole booking text, so the required purpose is never empty

#### Scenario: An IBAN with nothing after it

- **WHEN** the line holding the IBAN carries no text after it and no later line exists
- **THEN** the counterparty name is the whole booking text, so the required name is never empty

### Requirement: The sync pages through the transaction list until the window is covered

The sync SHALL follow the list's own next-page control, page by page, and SHALL stop when it reaches a row older than the retrieval window or when there is no next page. The retrieved set SHALL be the rows of every page it read, in the order the list presents them.

#### Scenario: More than one page is read

- **WHEN** the window reaches past the first page of the list
- **THEN** the sync reads the following pages until the window is covered and imports the rows of all of them

#### Scenario: Paging stops at the window

- **WHEN** a page holds a row older than the retrieval window
- **THEN** the sync stops paging and imports no row older than the window

### Requirement: The retrieval window reaches back at least two calendar quarters

The sync SHALL retrieve a window of transactions ending on the run's date and reaching back at least the current and the preceding calendar quarter, the widest range the bank's transaction search offers, so that a transaction posted late is still retrieved by a later run.

#### Scenario: The window covers the current and preceding quarter

- **WHEN** the sync runs
- **THEN** the retrieved set spans at least the current and the preceding calendar quarter

#### Scenario: A late-posted transaction is included

- **WHEN** a transaction is booked in the past but appears in the bank's transaction list only after the run that first covered its booking date
- **THEN** a later run still retrieves it, and it is imported then unless the value-date floor excludes it

### Requirement: The sync never imports a transaction with a value date on or before 2026-09-20

The sync SHALL exclude every retrieved row whose value date is 2026-09-20 or earlier, and SHALL import only rows whose value date is 2026-09-21 or later. The value date SHALL decide the exclusion, not the booking date. The floor SHALL take precedence over the retrieval window: a row the window retrieves but the floor excludes SHALL NOT be imported. An excluded row SHALL be skipped rather than reported as an invalid row, and SHALL NOT be counted among the rows read, the rows already stored, or the rows written. The exclusion SHALL apply to the nightly run and to the manual sync command alike.

#### Scenario: An earlier value date is skipped

- **WHEN** a retrieved row's value date is 2026-09-19
- **THEN** it is not imported and the run does not report it as an invalid row

#### Scenario: The boundary day is skipped

- **WHEN** a retrieved row's value date is 2026-09-20
- **THEN** it is not imported

#### Scenario: The first imported day is 2026-09-21

- **WHEN** a retrieved row's value date is 2026-09-21
- **THEN** it is imported like any other new row

#### Scenario: The booking date does not decide it

- **WHEN** a retrieved row's booking date is after 2026-09-20 but its value date is on or before it
- **THEN** it is excluded

#### Scenario: An excluded row is not counted

- **WHEN** a run retrieves rows the floor excludes
- **THEN** the run's recorded counts cover only the rows that passed the floor

#### Scenario: The manual command applies the same floor

- **WHEN** the manual sync command runs
- **THEN** it excludes the same rows the nightly run would

### Requirement: The bank credentials come from the environment and are never disclosed

The sync SHALL read the bank credentials from the process environment at run time, and SHALL NOT require them in a committed file. No credential SHALL appear in a response, a log line, or a recorded run. When the credentials are absent, the sync SHALL not run and SHALL record no run.

#### Scenario: The credentials are read from the environment

- **WHEN** the server is started with the bank credentials present in the environment
- **THEN** the sync reads them from there and holds them for the login

#### Scenario: Absent credentials mean no run

- **WHEN** the sync's time arrives with no bank credentials in the environment
- **THEN** no login is attempted and no import run is recorded

#### Scenario: No credential is disclosed

- **WHEN** a sync run succeeds or fails
- **THEN** neither its output, nor any log line, nor the recorded run contains the credentials or any part of them

### Requirement: Retrieved rows go through the same import path as a manual file

The sync SHALL hand the retrieved rows to the same import path the manual CSV import uses, as the `transaction-csv-import` capability defines, so that a row already stored is skipped and no stored transaction is updated or deleted.

#### Scenario: A row already stored is skipped

- **WHEN** the retrieved rows hold a transaction the table already holds
- **THEN** no second copy of that transaction is written

#### Scenario: Stored rows are left alone

- **WHEN** the sync imports new rows
- **THEN** every transaction that was already stored is unchanged

### Requirement: The sync is non-writing until writing is enabled

The sync SHALL run non-writing until writing is enabled by configuration: it SHALL classify each retrieved row as new or already stored, record the run, and write no transaction. Enabling writing SHALL be a configuration change, not a code change.

#### Scenario: The default run writes nothing

- **WHEN** the sync runs before writing is enabled
- **THEN** it records the run and writes no transaction, and the record states that the run was non-writing

#### Scenario: An enabled run writes the new rows

- **WHEN** writing is enabled and the sync runs
- **THEN** it writes the rows that were not already stored and records the run as a writing run

### Requirement: A failed run is recorded, writes no transaction, and does not stop the server

A sync run that cannot log in, cannot retrieve the transaction list, or cannot import it SHALL be recorded as failed with a reason, SHALL write no transaction, and SHALL leave the server serving and the next night's run scheduled.

#### Scenario: A login failure is recorded

- **WHEN** the bank rejects the login
- **THEN** the run is recorded as failed with the reason, and no transaction is written

#### Scenario: A retrieval failure is recorded

- **WHEN** the bank's transaction list cannot be retrieved
- **THEN** the run is recorded as failed with the reason, and no transaction is written

#### Scenario: An import failure is recorded

- **WHEN** the retrieved rows hold an invalid row and the import writes nothing
- **THEN** the run is recorded as failed with the reason, and no transaction is written

#### Scenario: The server keeps serving

- **WHEN** a sync run fails
- **THEN** the server continues to serve its pages and endpoints, and the next night's run is still scheduled

### Requirement: The same sync can be run by hand

The system SHALL offer a command that runs the same sync by hand, reading the same credentials from the environment, retrieving the same window, and offering the same non-writing mode, so the login, the retrieval, and the counts can be checked before a nightly write is trusted.

#### Scenario: A manual non-writing run changes nothing

- **WHEN** the sync command is run before writing is enabled
- **THEN** it records a run, reports what it retrieved and what it would add, and writes no transaction

#### Scenario: A manual run with writing enabled imports

- **WHEN** the sync command is run with writing enabled
- **THEN** it imports the new rows and records the run as a writing run
