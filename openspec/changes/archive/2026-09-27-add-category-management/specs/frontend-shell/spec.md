# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: The only route is the index route, and it is rendered by the browser`
- TO: `### Requirement: The browser routes are rendered by the browser and reached from the menu bar`

## MODIFIED Requirements

### Requirement: The browser routes are rendered by the browser and reached from the menu bar

The system SHALL provide a browser route at `/` that presents the transactions table defined by
the `transaction-table` capability, and a second browser route that presents the category
management screen defined by the `category-management-screen` capability. The layout SHALL carry
a menu bar, as `category-management-screen` defines, through which both routes are reached.
Neither route SHALL show invented data presented as though it were the user's own. Both routes
SHALL be rendered by the browser rather than by the server, so the document delivered first
carries the application shell and each screen's content is assembled by the browser afterwards.
The server SHALL serve the application shell for any path, including a path no route matches,
and SHALL NOT answer an unknown path as a missing resource; the browser SHALL render the failure
page for a path its router cannot match.

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

#### Scenario: Each route is reached from the menu bar

- **WHEN** the application is shown
- **THEN** the menu bar links to the transactions route and the category management route, and following a link reaches that screen
