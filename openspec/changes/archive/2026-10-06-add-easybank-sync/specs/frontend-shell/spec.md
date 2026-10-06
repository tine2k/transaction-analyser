# Spec Delta

## MODIFIED Requirements

### Requirement: The browser routes are rendered by the browser and reached from the menu bar

The system SHALL provide a browser route at `/` that presents the transactions table defined by
the `transaction-table` capability, a browser route that presents the category management screen
defined by the `category-management-screen` capability, and a browser route at `/analytics` that
presents the category spending chart defined by the `category-spending-chart` capability, a
browser route at `/monthly-totals` that presents the monthly category totals table defined by the
`monthly-category-totals-table` capability, a browser route at `/monthly-average` that
presents the per-category monthly average defined by the `monthly-category-average` capability,
and a browser route at `/imports` that presents the import log defined by the `import-log`
capability. The layout SHALL carry a menu bar, as `category-management-screen` defines, through
which all six routes are reached. Neither route SHALL show invented data presented as though it
were the user's own. All routes SHALL be rendered by the browser rather than by the server, so the
document delivered first carries the application shell and each screen's content is assembled by
the browser afterwards. The server SHALL serve the application shell for any path, including a
path no route matches, and SHALL NOT answer an unknown path as a missing resource; the browser
SHALL render the failure page for a path its router cannot match.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: Nothing is invented to fill the page

- **WHEN** a route is rendered
- **THEN** only data the read endpoints returned is shown, and no transaction, category, amount, or import run is shown as an example

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than a defined route is requested
- **THEN** the application shell is delivered for that path, and the browser renders the failure page because its router matches no route, without the server reporting the path as missing

#### Scenario: The browser assembles the rows

- **WHEN** a route is requested and its endpoint returns data
- **THEN** the delivered document carries the application shell rather than the data, and the screen is assembled by the browser once it has run, so the browser has to run the application to reveal it

#### Scenario: The category route presents the management screen

- **WHEN** the category management route is requested
- **THEN** a page is delivered that presents the category management screen

#### Scenario: The analytics route presents the category spending chart

- **WHEN** the `/analytics` route is requested
- **THEN** a page is delivered that presents the category spending chart

#### Scenario: The monthly totals route presents the category-by-month table

- **WHEN** the `/monthly-totals` route is requested
- **THEN** a page is delivered that presents the monthly category totals table

#### Scenario: The monthly average route presents the per-category average

- **WHEN** the `/monthly-average` route is requested
- **THEN** a page is delivered that presents each represented category's monthly average

#### Scenario: The imports route presents the import log

- **WHEN** the `/imports` route is requested
- **THEN** a page is delivered that presents the import log

#### Scenario: Each route is reached from the menu bar

- **WHEN** the application is shown
- **THEN** the menu bar links to the transactions route, the category management route, the analytics route, the monthly totals route, the monthly average route, and the imports route, and following each link reaches that screen

### Requirement: The shell performs no domain work

The system SHALL NOT compute, derive, aggregate, or infer values about transactions or categories
except for the transaction page's filter counts: the total number of transactions returned by its
one read request and the number of those transactions whose category is null; the category
spending chart's per-category sums of absolute transaction amounts grouped into twelve calendar
months by booking date: the current month and the eleven preceding months; the monthly category
totals table's per-category sums of absolute transaction amounts grouped by booking month for every
month represented by a transaction returned from the endpoint; and the monthly average page's
per-category average of absolute transaction amounts over a configurable rolling window of recent
booking months. The transaction page MAY use category presence to select which returned rows to
display, but SHALL NOT alter the returned data or evaluate any category's regular expression. The
category spending chart, monthly category totals table, and monthly average page MAY group and
aggregate the transactions returned by their single read request as their capabilities define. The
imports screen MAY display the run records the import log returns, without deriving a transaction
value from them. The browser SHALL NOT create, alter, or delete any stored data; the scheduled
sync is the application's only writer, and no browser request can start it or change a run record.
The shell's relationship to stored data SHALL be through same-origin read-only API requests and
SHALL NOT run a statement against the database itself. The transaction table SHALL present
transaction values exactly as the endpoint returned them. Apart from the two transaction filter
counts, the selected view of returned transactions, the monthly aggregations defined by
`category-spending-chart`, `monthly-category-totals-table`, and `monthly-category-average`, and
the run records the import log returns, the shell SHALL NOT total, average, group, or otherwise
derive a value from transaction data for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated anywhere, and no transaction is assigned a category

#### Scenario: Only the filter counts are derived from transactions

- **WHEN** the index route or an analytics route renders its transaction-derived values
- **THEN** the index route displays only the total returned transaction count and count with a null category, the analytics route displays only the twelve per-month category absolute totals defined by its capability, the monthly totals route displays only the per-month category absolute totals defined by its capability for months represented in returned transactions, and the monthly average route displays only the per-category average absolute totals defined by its capability for the configured window

#### Scenario: Filtering does not alter returned values or data

- **WHEN** the user selects the uncategorised-only view
- **THEN** the page only chooses which returned transactions to show, presents their values unchanged, and writes no data

#### Scenario: The shell reads only through the read endpoint

- **WHEN** any screen obtains stored data
- **THEN** it does so through a same-origin read request to the endpoint for that data and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the browser uses the application
- **THEN** no row is created, altered, or deleted by a browser request, because no endpoint alters stored data and none starts an import

#### Scenario: The scheduled sync is the writer

- **WHEN** the nightly sync runs
- **THEN** it writes through the server process, not through the browser, and the browser neither starts it nor changes what it writes
