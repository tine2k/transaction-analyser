# Spec Delta

## MODIFIED Requirements

### Requirement: The shell performs no domain work

The system SHALL NOT compute, derive, aggregate, or infer values about transactions or categories
except for the transaction page's filter counts: the total number of transactions returned by its
one read request and the number of those transactions whose category is null; the monthly category
overview's per-category sums of absolute transaction amounts for one selected calendar month, the
selected month's total of those absolute amounts, the selected month's included transaction count,
and the eight largest categories plus the remainder used by its stacked bar; the monthly category
totals table's per-category sums of absolute transaction amounts grouped by booking month for every
month represented by a transaction returned from the endpoint; and the monthly average page's
per-category monthly absolute totals within its configurable rolling window of recent booking
months, each category's exact window total and average, the page-wide average per month for the
current person and expense-type selection, and the person-scoped recurring and one-time monthly
averages. The transaction page MAY use category presence to select which returned rows to
display, but SHALL NOT alter the returned data or evaluate any category's regular expression. The
monthly category overview, monthly category totals table, and monthly average page MAY group and
aggregate the transactions returned by their single read request as their capabilities define. The
imports screen MAY display the run records the import log returns, without deriving a transaction
value from them. The browser SHALL NOT create, alter, or delete any stored data itself, and SHALL
NOT run a statement against the database. The browser MAY start the Easybank sync through the
sync-start endpoint, as `easybank-sync` defines; a run that request starts writes through the
server process and the shared import path, not through the browser, and the browser cannot change a
recorded run. The shell's relationship to stored data SHALL be through same-origin API requests:
stored data is read through read-only requests, and a write is requested through the category
management surface or the sync-start endpoint and is performed by the server, never by the browser
itself. The transaction table SHALL present
transaction values exactly as the endpoint returned them. Apart from the two transaction filter
counts, the selected view of returned transactions, the monthly figures defined by
`category-spending-chart`, `monthly-category-totals-table`, and `monthly-category-average`, and
the run records the import log returns, the shell SHALL NOT total, average, group, or otherwise
derive a value from transaction data for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated by the browser, and no transaction is assigned a category by the browser

#### Scenario: Only the filter counts are derived from transactions

- **WHEN** the index route or the monthly route renders its transaction-derived values
- **THEN** the index route displays only the total returned transaction count and count with a null category, the monthly route displays only the selected month's absolute total, included transaction count, per-category absolute totals, and top-eight grouping defined by its capability, the monthly totals route displays only the per-month category absolute totals defined by its capability for months represented in returned transactions, and the monthly average route displays only the per-category monthly absolute totals, per-category window totals and averages, current-selection average per month, recurring average per month, and one-time average per month defined by its capability for the configured window

#### Scenario: Filtering does not alter returned values or data

- **WHEN** the user selects the uncategorised-only view
- **THEN** the page only chooses which returned transactions to show, presents their values unchanged, and writes no data

#### Scenario: The shell reads only through the read endpoint

- **WHEN** any screen obtains stored data
- **THEN** it does so through a same-origin read request to the endpoint for that data and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the browser uses the application
- **THEN** no row is created, altered, or deleted by the browser itself, because a write is requested through the category management surface or the sync-start endpoint and the server performs it

#### Scenario: The category write is the server's

- **WHEN** a pattern is appended through the transaction shortcut
- **THEN** the browser sends the captured text in a same-origin request to the category management surface, evaluates no expression, and the server stores the pattern and applies the assignment

#### Scenario: The sync can be started from the imports screen

- **WHEN** the sync control on the imports screen is used
- **THEN** the browser makes a same-origin request to the sync-start endpoint, performs no retrieval and no write itself, and shows the outcome the endpoint returns

#### Scenario: The scheduled sync is the writer

- **WHEN** a sync run writes
- **THEN** it writes through the server process, not through the browser, and the browser cannot change what it writes
