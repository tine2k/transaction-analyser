# Frontend Shell Specification

## Purpose

Defines the browser half of the application: that every route renders inside one default layout, that the only route is an index route holding placeholder text, that a failure renders a defined page rather than a blank screen, that styling arrives through one stylesheet with no component library, and that the browser is never given a database address and reaches the server only through the same-origin API.

## Requirements

### Requirement: Every route renders inside one default layout

The system SHALL render every route inside one default layout, which supplies the application's frame: the document's shared metadata, the page container, and the shared heading area. No route SHALL be able to render outside that layout. The layout SHALL apply to the failure page as well as to the routes, so that a failure is presented in the same frame as a successful page. The system SHALL NOT add a second layout, and SHALL NOT let a route opt out of the default one. The frame's page container SHALL span the full width of the viewport, and SHALL NOT constrain itself to a centered maximum-width column, so that the frame uses the horizontal room a large display provides. The frame SHALL hold a horizontal padding inset so its content is not flush against the viewport edge.

#### Scenario: A route renders inside the frame

- **WHEN** the index route is requested
- **THEN** the response contains the shared frame with the page's content inside it

#### Scenario: The failure page uses the same frame

- **WHEN** a request fails, or names a route that does not exist
- **THEN** the failure page is delivered inside the same frame as a successful page

#### Scenario: There is exactly one layout and no route escapes it

- **WHEN** the application's layouts and routes are inspected
- **THEN** exactly one layout is defined, it is the one every route renders in, and no route declares that it renders without it

#### Scenario: The frame spans the viewport width

- **WHEN** a route is rendered on a display wider than the frame's content
- **THEN** the frame's container extends to the full width of the viewport rather than stopping at a centered maximum-width column, with only a horizontal padding inset between the content and the viewport edge

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

### Requirement: Styling arrives through one stylesheet, with no component library

The system SHALL load one stylesheet as part of the application, and that stylesheet SHALL
provide the utility classes the templates use, so that a class written in any template is styled.
The stylesheet SHALL define the application's theme as design tokens, and those tokens SHALL be
the single source for the palette, type, radius, and surface values the templates use.
The stylesheet SHALL apply to the failure page as well as to the routes. The system SHALL NOT add
a general-purpose prebuilt component library, design system, or headless component kit, and
SHALL NOT hand-write a second global stylesheet beside the utility one. The system SHALL use at
most one icon package, imported as tree-shaken components and delivered from the application's
own assets; it SHALL NOT use an icon font, a runtime icon service, or a second icon family.
Icons SHALL be decorative: a navigation link or action control that carries an icon SHALL keep
its visible text label, and a control that shows an icon without a visible label SHALL carry an
accessible name. A charting library MAY be used solely to render the category spending
visualization.

#### Scenario: A utility class is styled

- **WHEN** a template uses a class the stylesheet defines
- **THEN** the delivered page carries the styling that class names

#### Scenario: Templates take their values from the theme

- **WHEN** any route is rendered
- **THEN** its colors, type, and surfaces resolve to the theme tokens defined in the one stylesheet

#### Scenario: The failure page is styled by the same stylesheet

- **WHEN** the failure page is delivered
- **THEN** it is styled by the same stylesheet as every other route, with no separate styling of its own

#### Scenario: No component library is present

- **WHEN** the project's dependencies are inspected
- **THEN** no general-purpose component library, design system, headless component kit, icon font, or second icon family is present, at most one icon package is among them, and the charting library may be used only for the category spending visualization

#### Scenario: Icons accompany visible text

- **WHEN** a navigation link or an action control carrying an icon is rendered
- **THEN** the control still shows its text label, and the icon is exposed as decorative rather than as the control's only name

#### Scenario: A standalone icon control is named

- **WHEN** a control shows an icon without a visible text label
- **THEN** it carries an accessible name

#### Scenario: Icons come from the application's own assets

- **WHEN** the delivered page and its assets are inspected, and the page is used
- **THEN** icons are delivered by the application itself, with no request to another origin for an icon

### Requirement: The application renders with one themed palette

The system SHALL define the application's palette once as theme tokens with explicit roles: a paper ground, a surface, ink and muted text, rules, and a failure color. Every route, including the failure page, SHALL render with those roles. Color in content SHALL identify categories, mark failures, or mark destructive actions: the system SHALL NOT apply decorative accent colors to controls, and the failure color SHALL be used only for failures and destructive actions.

#### Scenario: Every route renders with the theme's roles

- **WHEN** any route, including the failure page, is delivered
- **THEN** its ground, surfaces, text, rules, and controls resolve to the theme's role tokens rather than to per-screen values

#### Scenario: Category colors come from the one category palette

- **WHEN** categories are shown in a chart, a totals list, or a row indicator
- **THEN** each category's color comes from the single application category palette

#### Scenario: The failure color marks failures and destructive actions

- **WHEN** a failure is presented, such as a failed import run, a form error, or the failure page
- **THEN** it uses the failure color; **WHEN** a destructive action such as deleting a category is presented, it may use the failure color; **WHEN** content is neither a failure nor a destructive action, no element uses that color

#### Scenario: Controls are not accent-colored

- **WHEN** a button, link, filter, or select is rendered
- **THEN** its resting, hover, and focus states use the theme's ink, muted, and rule values rather than an accent hue

### Requirement: Type is set in three roles

The system SHALL set the application masthead and page titles in a serif display face, interface and tabular content in a sans-serif face, and machine-generated strings shown to the user — category patterns, counterparty accounts, and import timestamps — in a monospaced face. The faces SHALL be served from the application's own origin. Amounts and counts SHALL be set with tabular figures.

#### Scenario: Titles use the display face

- **WHEN** a route is rendered
- **THEN** the application masthead and the page title are set in the serif display face

#### Scenario: Machine strings use the monospaced face

- **WHEN** a category pattern, a counterparty account, or an import timestamp is shown
- **THEN** it is set in the monospaced face

#### Scenario: Figures align

- **WHEN** amounts or counts are displayed in a column or an aligned list
- **THEN** they use tabular figures

#### Scenario: Faces load from the application's own origin

- **WHEN** the delivered page and its assets are inspected
- **THEN** the typefaces are served by the application itself, with no request to another origin

### Requirement: Amounts are never distinguished by color

The system SHALL present every euro amount in the theme's ink color. It SHALL NOT encode an amount's sign, magnitude, or category membership as a color: a negative amount SHALL be distinguished only by the sign that `euro-value-display` requires it to be shown with, and the failure color SHALL NOT be applied to an amount.

#### Scenario: A negative amount is ink-colored

- **WHEN** a transaction amount or a derived total is negative
- **THEN** it is rendered in ink with its sign, not in a warning or failure color

#### Scenario: A category's amount is ink-colored

- **WHEN** an amount belongs to a category
- **THEN** the amount text remains ink-colored, and only the category's own indicator carries the category color

#### Scenario: The failure color never marks an amount

- **WHEN** any amount, including a large negative sum, is displayed
- **THEN** it does not use the failure color

### Requirement: Content surfaces are sheets separated by rules

The system SHALL separate content with the surface color over the paper ground, divided by theme rules, rather than with decorative shadows or identical bordered cards. Elevation SHALL be reserved for elements that float above content, such as the fixed action bars on the transactions screen.

#### Scenario: Panels are not shadowed cards

- **WHEN** chart panels or list panels are rendered
- **THEN** they are separated by rules and the surface-over-paper distinction, with no decorative shadow

#### Scenario: Floating elements may elevate

- **WHEN** the transactions screen shows its fixed action bars
- **THEN** those bars may carry a shadow because they float above the table

### Requirement: The browser is never given a database address

The system SHALL NOT deliver the database address, a user name, a password, or any part of a connection string to the browser, whether in a rendered document, in a delivered client asset, or in any response. The system SHALL NOT deliver any configuration value intended for the server alone. The browser SHALL reach the server's functionality only through same-origin requests to the API, and the system SHALL NOT require a cross-origin request from the page.

#### Scenario: No credential is in the delivered document

- **WHEN** the index route is requested
- **THEN** the delivered document contains no database address, no user name, and no password

#### Scenario: No credential is in the delivered assets

- **WHEN** the application's client assets are inspected
- **THEN** they contain no database address, no user name, and no password, and no configuration value meant for the server alone

#### Scenario: The page talks only to its own origin

- **WHEN** the page makes a request for data or for a status
- **THEN** the request is a same-origin request to the API, and no request to another origin is required or made

### Requirement: The browser holds no identity and no credential

The system SHALL present no login, no account, no sign-in control, and no user identity, and the browser SHALL store no credential for this application in a cookie, in local storage, or in session storage. The shell SHALL NOT send a stored token with a request.

#### Scenario: No sign-in exists

- **WHEN** any page is rendered
- **THEN** no control asks the user to identify themselves, and the application names no user

#### Scenario: Nothing is stored in the browser

- **WHEN** a page is used
- **THEN** the application writes no cookie, no local storage entry, and no session storage entry

#### Scenario: No token is sent

- **WHEN** the page makes a request to the API
- **THEN** the request carries no token and no authorization header of the application's own

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
value from them. The browser SHALL NOT create, alter, or delete any stored data itself, and SHALL
NOT run a statement against the database. The browser MAY start the Easybank sync through the
sync-start endpoint, as `easybank-sync` defines; a run that request starts writes through the
server process and the shared import path, not through the browser, and the browser cannot change a
recorded run. The shell's relationship to stored data SHALL be through same-origin API requests:
stored data is read through read-only requests, and a write is requested through the category
management surface or the sync-start endpoint and is performed by the server, never by the browser
itself. The transaction table SHALL present
transaction values exactly as the endpoint returned them. Apart from the two transaction filter
counts, the selected view of returned transactions, the monthly aggregations defined by
`category-spending-chart`, `monthly-category-totals-table`, and `monthly-category-average`, and
the run records the import log returns, the shell SHALL NOT total, average, group, or otherwise
derive a value from transaction data for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated by the browser, and no transaction is assigned a category by the browser

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
