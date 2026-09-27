# Spec Delta

## REMOVED Requirements

### Requirement: The only route is the index route, and it presents the transactions table

**Reason**: The requirement stated that the table's rows are present in the delivered document because the route is rendered by the server, and a scenario asserted it. The application no longer server-renders, so that behavior is removed. The scenarios cannot be carried over because one of them is the behavior being removed.

**Migration**: The route's identity as the single index route, its rendering inside the one default layout, its exclusion of invented data, and its prohibition on writing are carried forward by the added requirement `The only route is the index route, and it is rendered by the browser`, with the server-rendering sentence and its scenario replaced by browser rendering.

## ADDED Requirements

### Requirement: The only route is the index route, and it is rendered by the browser

The system SHALL provide exactly one route, the index route at `/`, which presents the transactions table defined by the `transaction-table` capability. The index route SHALL NOT show invented data presented as though it were the user's own, and SHALL NOT present a control that creates, alters, or deletes stored data. The index route SHALL be rendered by the browser rather than by the server, so the document delivered first carries the application shell and the table's rows are assembled by the browser afterwards. The browser SHALL obtain the rows from the same-origin read endpoint, and the delivered document SHALL NOT be required to contain them. The server SHALL serve the application shell for any path, including a path no route matches, and SHALL NOT answer an unknown path as a missing resource; the browser SHALL render the failure page for a path its router cannot match.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: Nothing is invented to fill the page

- **WHEN** the index route is rendered
- **THEN** only transactions the read endpoint returned are shown, and no transaction, category, or amount is shown as an example

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than the index route is requested
- **THEN** the application shell is delivered for that path, and the browser renders the failure page because its router matches no route, without the server reporting the path as missing

#### Scenario: The browser assembles the rows

- **WHEN** the index route is requested and the read endpoint returns transactions
- **THEN** the delivered document carries the application shell rather than the rows, and those rows are assembled by the browser once it has run, so the browser has to run the application to reveal them
