# Frontend Shell Specification

## Purpose

Defines the browser half of the application: that every route renders inside one default layout, that the only route is an index route holding placeholder text, that a failure renders a defined page rather than a blank screen, that styling arrives through one stylesheet with no component library, and that the browser is never given a database address and reaches the server only through the same-origin API.

## Requirements

### Requirement: Every route renders inside one default layout

The system SHALL render every route inside one default layout, which supplies the application's frame: the document's shared metadata, the page container, and the shared heading area. No route SHALL be able to render outside that layout. The layout SHALL apply to the failure page as well as to the routes, so that a failure is presented in the same frame as a successful page. The system SHALL NOT add a second layout, and SHALL NOT let a route opt out of the default one.

#### Scenario: A route renders inside the frame

- **WHEN** the index route is requested
- **THEN** the response contains the shared frame with the page's content inside it

#### Scenario: The failure page uses the same frame

- **WHEN** a request fails, or names a route that does not exist
- **THEN** the failure page is delivered inside the same frame as a successful page

#### Scenario: There is exactly one layout and no route escapes it

- **WHEN** the application's layouts and routes are inspected
- **THEN** exactly one layout is defined, it is the one every route renders in, and no route declares that it renders without it

### Requirement: The only route is the index route, and it presents the transactions table

The system SHALL provide exactly one route, the index route at `/`, which presents the transactions table defined by the `transaction-table` capability. The index route SHALL NOT show invented data presented as though it were the user's own, and SHALL NOT present a control that creates, alters, or deletes stored data. The table's rows SHALL already be present in the delivered document, so that the index route is rendered by the server rather than assembled by the browser afterwards.

#### Scenario: The index route presents the table

- **WHEN** the index route is requested
- **THEN** a page is delivered that presents the transactions table

#### Scenario: Nothing is invented to fill the page

- **WHEN** the index route is rendered
- **THEN** only transactions the read endpoint returned are shown, and no transaction, category, or amount is shown as an example

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than the index route is requested
- **THEN** the failure page is delivered with a status saying that the route does not exist

#### Scenario: The delivered document already holds the rows

- **WHEN** the index route is requested and the read endpoint returns transactions
- **THEN** those rows are present in the delivered document, without the browser having to run anything to reveal them

### Requirement: Styling arrives through one stylesheet, with no component library

The system SHALL load one stylesheet as part of the application, and that stylesheet SHALL provide the utility classes the templates use, so that a class written in any template is styled. The stylesheet SHALL apply to the failure page as well as to the routes. The system SHALL NOT add a prebuilt component library, a design system, an icon set, or a headless component kit, and SHALL NOT hand-write a second global stylesheet beside the utility one. Design tokens, a theme, and conventions for reusable components are deferred to the first change that renders real content.

#### Scenario: A utility class is styled

- **WHEN** a template uses a class the stylesheet defines
- **THEN** the delivered page carries the styling that class names

#### Scenario: The failure page is styled by the same stylesheet

- **WHEN** the failure page is delivered
- **THEN** it is styled by the same stylesheet as every other route, with no separate styling of its own

#### Scenario: No component library is present

- **WHEN** the project's dependencies are inspected
- **THEN** no component library, design system, or icon set is among them, and all styling comes from the one stylesheet

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

The system SHALL NOT compute, derive, aggregate, or infer any value about a transaction or a category, and SHALL NOT evaluate any category's regular expression. The system SHALL NOT create, alter, or delete any stored data. The shell's only relationship to stored data is the single read request the transactions table makes to the read-only transactions endpoint; the shell SHALL NOT run a statement against the database, and the values it presents SHALL be exactly those the endpoint returned, unchanged. The shell SHALL NOT total, average, count, group, or otherwise derive a value from the returned transactions for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated anywhere, and no transaction is assigned a category

#### Scenario: Nothing is derived from stored data

- **WHEN** the index route is rendered
- **THEN** no total, count, balance, grouping, or other derived value of stored data is computed for display, and only the values the read endpoint returned are shown

#### Scenario: The shell reads only through the read endpoint

- **WHEN** the shell obtains transaction data
- **THEN** it does so through the one read request to the transactions endpoint and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the application runs
- **THEN** no row is created, altered, or deleted, which the absence of any endpoint on the server that alters data also guarantees
