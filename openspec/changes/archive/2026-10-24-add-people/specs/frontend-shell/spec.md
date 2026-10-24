# Spec Delta

## MODIFIED Requirements

### Requirement: Every route names itself in the browser tab

The document title SHALL name the screen shown, then the application: `Transactions · Expenses` for
`/`, `Categories · Expenses`, `People · Expenses`, `Analytics · Expenses`,
`Monthly totals · Expenses`, `Monthly average · Expenses`, and `Imports · Expenses`. A page that
names no screen SHALL show `Expenses` alone.

#### Scenario: The transactions route names itself

- **WHEN** `/` is shown
- **THEN** the document title is `Transactions · Expenses`

#### Scenario: Each named route names itself

- **WHEN** `/categories`, `/people`, `/analytics`, `/monthly-totals`, `/monthly-average`, or `/imports` is shown
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

### Requirement: The browser routes are rendered by the browser and reached from the menu bar

The system SHALL provide a browser route at `/` that presents the transactions table defined by
the `transaction-table` capability, a browser route that presents the category management screen
defined by the `category-management-screen` capability, a browser route at `/people` that presents
the people management screen defined by the `person-management-screen` capability, and a browser
route at `/analytics` that presents the category spending chart defined by the
`category-spending-chart` capability, a browser route at `/monthly-totals` that presents the monthly
category totals table defined by the `monthly-category-totals-table` capability, a browser route at
`/monthly-average` that presents the per-category monthly average defined by the
`monthly-category-average` capability, and a browser route at `/imports` that presents the import
log defined by the `import-log` capability. The layout SHALL carry a menu bar, as
`category-management-screen` defines, through which all seven routes are reached. Neither route
SHALL show invented data presented as though it were the user's own. All routes SHALL be rendered by
the browser rather than by the server, so the document delivered first carries the application shell
and each screen's content is assembled by the browser afterwards. The server SHALL serve the
application shell for any path, including a path no route matches, and SHALL NOT answer an unknown
path as a missing resource; the browser SHALL render the failure page for a path its router cannot
match.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: Nothing is invented to fill the page

- **WHEN** a route is rendered
- **THEN** only data the read endpoints returned is shown, and no transaction, person, category, amount, or import run is shown as an example

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than a defined route is requested
- **THEN** the application shell is delivered for that path, and the browser renders the failure page because its router matches no route, without the server reporting the path as missing

#### Scenario: The browser assembles the rows

- **WHEN** a route is requested and its endpoint returns data
- **THEN** the delivered document carries the application shell rather than the data, and the screen is assembled by the browser once it has run, so the browser has to run the application to reveal it

#### Scenario: The category route presents the management screen

- **WHEN** the category management route is requested
- **THEN** a page is delivered that presents the category management screen

#### Scenario: The people route presents the management screen

- **WHEN** the `/people` route is requested
- **THEN** a page is delivered that presents the people management screen

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
- **THEN** the menu bar links to the transactions route, the category management route, the people management route, the analytics route, the monthly totals route, the monthly average route, and the imports route, and following each link reaches that screen
