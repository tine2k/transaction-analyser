# Spec Delta

## MODIFIED Requirements

### Requirement: The browser routes are rendered by the browser and reached from the menu bar

The system SHALL provide a browser route at `/` that presents the transactions table defined by
the `transaction-table` capability, a browser route that presents the category management screen
defined by the `category-management-screen` capability, and a browser route at `/analytics` that
presents the category spending chart defined by the `category-spending-chart` capability. The
layout SHALL carry a menu bar, as `category-management-screen` defines, through which all three
routes are reached. Neither route SHALL show invented data presented as though it were the user's
own. All routes SHALL be rendered by the browser rather than by the server, so the document
delivered first carries the application shell and each screen's content is assembled by the
browser afterwards. The server SHALL serve the application shell for any path, including a path no
route matches, and SHALL NOT answer an unknown path as a missing resource; the browser SHALL
render the failure page for a path its router cannot match.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: Nothing is invented to fill the page

- **WHEN** a route is rendered
- **THEN** only data the read endpoints returned is shown, and no transaction, category, or amount is shown as an example

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

#### Scenario: Each route is reached from the menu bar

- **WHEN** the application is shown
- **THEN** the menu bar links to the transactions route, the category management route, and the analytics route, and following each link reaches that screen

### Requirement: Styling arrives through one stylesheet, with no component library

The system SHALL load one stylesheet as part of the application, and that stylesheet SHALL
provide the utility classes the templates use, so that a class written in any template is styled.
The stylesheet SHALL apply to the failure page as well as to the routes. The system SHALL NOT add
a general-purpose prebuilt component library, design system, icon set, or headless component kit,
and SHALL NOT hand-write a second global stylesheet beside the utility one. A charting library
MAY be used solely to render the category spending visualization. Design tokens, a theme, and
conventions for reusable components are deferred to the first change that renders real content.

#### Scenario: A utility class is styled

- **WHEN** a template uses a class the stylesheet defines
- **THEN** the delivered page carries the styling that class names

#### Scenario: The failure page is styled by the same stylesheet

- **WHEN** the failure page is delivered
- **THEN** it is styled by the same stylesheet as every other page, with no separate styling of its own

#### Scenario: No component library is present

- **WHEN** the project's dependencies are inspected
- **THEN** no general-purpose component library, design system, icon set, or headless component kit is present, while a charting library may be used only for the category spending visualization

### Requirement: The shell performs no domain work

The system SHALL NOT compute, derive, aggregate, or infer values about transactions or categories
except for the transaction page's filter counts: the total number of transactions returned by its
one read request and the number of those transactions whose category is null; and the category
spending chart's per-category sums of absolute transaction amounts grouped into twelve calendar
months by booking date: the current month and the eleven preceding months. The transaction page
MAY use category presence to select which returned rows to display, but SHALL NOT alter the
returned data or evaluate any category's regular expression. The category spending chart MAY
group and aggregate the transactions returned by its single read request into its twelve monthly
charts as its capability defines. The system SHALL NOT create, alter, or delete any stored data.
The shell's relationship to stored data SHALL be through same-origin read-only API requests and
SHALL NOT run a statement against the database itself. The transaction table SHALL present
transaction values exactly as the endpoint returned them. Apart from the two transaction filter
counts, the selected view of returned transactions, and the monthly chart aggregation defined by
`category-spending-chart`, the shell SHALL NOT total, average, group, or otherwise derive a value
from transaction data for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated anywhere, and no transaction is assigned a category

#### Scenario: Only the filter counts are derived from transactions

- **WHEN** the index route renders its filter options and the analytics route renders its chart
- **THEN** the index route displays only the total returned transaction count and count with a null category, and the analytics route displays only the twelve per-month category absolute totals defined by its capability

#### Scenario: Filtering does not alter returned values or data

- **WHEN** the user selects the uncategorised-only view
- **THEN** the page only chooses which returned rows to show, presents their values unchanged, and writes no data

#### Scenario: The shell reads only through the read endpoint

- **WHEN** a screen obtains transaction data
- **THEN** it does so through a same-origin read-only API request and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the application runs
- **THEN** no row is created, altered, or deleted, which the absence of any endpoint on the server that alters data also guarantees
