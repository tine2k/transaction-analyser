# Spec Delta

## MODIFIED Requirements

### Requirement: Every route names itself in the browser tab

The document title SHALL name the screen shown, then the application: `Transactions · Expenses` for
`/`, `Categories · Expenses`, `People · Expenses`, `Monthly · Expenses`,
`Monthly totals · Expenses`, `Monthly average · Expenses`, and `Imports · Expenses`. A page that
names no screen SHALL show `Expenses` alone.

#### Scenario: The transactions route names itself

- **WHEN** `/` is shown
- **THEN** the document title is `Transactions · Expenses`

#### Scenario: Each named route names itself

- **WHEN** `/categories`, `/people`, `/monthly`, `/monthly-totals`, `/monthly-average`, or `/imports` is shown
- **THEN** the document title is that screen's name followed by ` · Expenses`

#### Scenario: A page without a screen name falls back to the application name

- **WHEN** a path matches no route and the failure page is shown
- **THEN** the document title is `Expenses`

#### Scenario: Navigation updates the title

- **WHEN** the user follows a navigation link from one screen to another
- **THEN** the document title changes to the screen now shown, without a reload

#### Scenario: The name appears once in the title

- **WHEN** any route's document title is read
- **THEN** it contains `Expenses` exactly once

### Requirement: The shell performs no domain work

The system SHALL NOT compute, derive, aggregate, or infer values about transactions or categories
except for the transaction page's filter counts: the total number of transactions returned by its
one read request and the number of those transactions whose category is null; the monthly category
overview's per-category sums of absolute transaction amounts for one selected calendar month, the
selected month's total of those absolute amounts, the selected month's included transaction count,
and the eight largest categories plus the remainder used by its stacked bar; the monthly category
totals table's per-category sums of absolute transaction amounts grouped by booking month for every
month represented by a transaction returned from the endpoint; and the monthly average page's
per-category average of absolute transaction amounts over a configurable rolling window of recent
booking months. The transaction page MAY use category presence to select which returned rows to
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
- **THEN** the index route displays only the total returned transaction count and count with a null category, the monthly route displays only the selected month's absolute total, included transaction count, per-category absolute totals, and top-eight grouping defined by its capability, the monthly totals route displays only the per-month category absolute totals defined by its capability for months represented in returned transactions, and the monthly average route displays only the per-category average absolute totals defined by its capability for the configured window

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

### Requirement: The menu bar carries the application's identity and the current screen

The shared menu bar SHALL present the application's logo mark immediately to the left of the application name `Expenses`, and one visibly labelled link for each of the seven routes. The mark SHALL be decorative: it SHALL NOT be a link or a control, SHALL NOT carry an accessible name of its own, and SHALL NOT change the name a screen reader reads for the application. The link for the current route SHALL be distinguishable without relying on colour alone. The bar SHALL NOT introduce a destination beyond the seven routes. On narrow viewports the bar SHALL keep a labelled disclosure control for the same links and SHALL keep the mark beside the name.

#### Scenario: The bar names the application

- **WHEN** any route is rendered
- **THEN** the shared menu bar shows the application name `Expenses`

#### Scenario: The mark sits beside the application name

- **WHEN** any route is rendered at a desktop or narrow viewport width
- **THEN** the shared menu bar shows the four-wedge logo mark immediately left of the `Expenses` wordmark

#### Scenario: The mark is decorative

- **WHEN** the shared menu bar is inspected for links and accessible names
- **THEN** the logo mark contributes no link, no control, and no accessible name, and the bar still names the application exactly once

#### Scenario: Every route has a labelled link

- **WHEN** the shared menu bar is rendered
- **THEN** it shows one link each for Transactions, Categories, People, Monthly, Monthly totals, Monthly average, and Imports, and no other destination

#### Scenario: The current screen is distinguishable

- **WHEN** a route is shown
- **THEN** its menu link is marked as current and is visually distinct from the other links by more than its hue

#### Scenario: The current screen follows navigation

- **WHEN** the user follows a menu link to another screen
- **THEN** the newly shown screen's link becomes the current one and the previous link loses that distinction

#### Scenario: Narrow viewports keep the disclosure

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the labelled disclosure control remains available, exposes the same seven links, and keeps its expanded state available to assistive technology

## REMOVED Requirements

### Requirement: The browser routes are rendered by the browser and reached from the menu bar

**Reason**: The route inventory replaces `/analytics` with `/monthly`, adds the `/analytics` redirect, and retires the analytics route and its scenarios. The replacement requirements below carry the surviving rendering, routing, and navigation behaviour.

**Migration**: Use `The application serves the seven browser routes`, `The server delivers the application shell for every path`, and `The browser assembles every route's content` below.

## ADDED Requirements

### Requirement: The application serves the seven browser routes

The system SHALL provide browser routes at `/` for the transactions table, a category management route, `/people`, `/monthly` for the monthly category overview, `/monthly-totals`, `/monthly-average`, and `/imports` for the import log, each presenting the screen defined by its capability. The layout SHALL carry a menu bar through which all seven routes are reached. All routes SHALL be rendered by the browser rather than by the server.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: The category route presents the management screen

- **WHEN** the category management route is requested
- **THEN** a page is delivered that presents the category management screen

#### Scenario: The people route presents the management screen

- **WHEN** the `/people` route is requested
- **THEN** a page is delivered that presents the people management screen

#### Scenario: The monthly route presents the category overview

- **WHEN** the `/monthly` route is requested
- **THEN** a page is delivered that presents the monthly category overview

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
- **THEN** the menu bar links to the transactions route, the category management route, the people management route, the monthly route, the monthly totals route, the monthly average route, and the imports route, and following each link reaches that screen

### Requirement: The server delivers the application shell for every path

The server SHALL serve the application shell for any path, including a path no route matches, and SHALL NOT answer an unknown path as a missing resource. The browser SHALL render the failure page for a path its router cannot match. The former `/analytics` path SHALL redirect to `/monthly` so an existing link reaches the replacement screen.

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than a defined route is requested
- **THEN** the application shell is delivered for that path, and the browser renders the failure page because its router matches no route, without the server reporting the path as missing

#### Scenario: The former analytics route redirects

- **WHEN** the `/analytics` path is requested
- **THEN** the browser reaches `/monthly` and presents the monthly category overview

### Requirement: The browser assembles every route's content

The delivered document SHALL carry the application shell rather than the data, and each screen's content SHALL be assembled by the browser once it has run. A route SHALL NOT show invented data presented as though it were the user's own.

#### Scenario: The browser assembles the rows

- **WHEN** a route is requested and its endpoint returns data
- **THEN** the delivered document carries the application shell rather than the data, and the screen is assembled by the browser once it has run, so the browser has to run the application to reveal it

#### Scenario: Nothing is invented to fill the page

- **WHEN** a route is rendered
- **THEN** only data the read endpoints returned is shown, and no transaction, person, category, amount, or import run is shown as an example
