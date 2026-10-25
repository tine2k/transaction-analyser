# Spec Delta

## MODIFIED Requirements

### Requirement: Every route names itself in the browser tab

The document title SHALL name the screen shown, then the application: `Transactions · Expenses` for
`/`, `Categories · Expenses`, `People · Expenses`, `Monthly · Expenses`,
`Yearly · Expenses`, `Monthly average · Expenses`, and `Imports · Expenses`. A page that
names no screen SHALL show `Expenses` alone.

#### Scenario: The transactions route names itself

- **WHEN** `/` is shown
- **THEN** the document title is `Transactions · Expenses`

#### Scenario: Each named route names itself

- **WHEN** `/categories`, `/people`, `/monthly`, `/yearly`, `/monthly-average`, or `/imports` is shown
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

### Requirement: The application serves the seven browser routes

The system SHALL provide browser routes at `/` for the transactions table, a category management route, `/people`, `/monthly` for the monthly category overview, `/yearly` for the yearly category-by-month matrix, `/monthly-average`, and `/imports` for the import log, each presenting the screen defined by its capability. The layout SHALL carry a menu bar through which all seven routes are reached. All routes SHALL be rendered by the browser rather than by the server.

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

- **WHEN** the former `/monthly-totals` route is requested
- **THEN** it redirects to `/yearly`, which presents the category-by-month matrix

#### Scenario: The yearly route presents the category-by-month matrix

- **WHEN** the `/yearly` route is requested
- **THEN** a page is delivered that presents the Yearly category-by-month matrix

#### Scenario: The monthly average route presents the per-category average

- **WHEN** the `/monthly-average` route is requested
- **THEN** a page is delivered that presents each represented category's monthly average

#### Scenario: The imports route presents the import log

- **WHEN** the `/imports` route is requested
- **THEN** a page is delivered that presents the import log

#### Scenario: Each route is reached from the menu bar

- **WHEN** the application is shown
- **THEN** the menu bar links to the transactions route, the category management route, the people management route, the monthly route, the yearly route, the monthly average route, and the imports route, and following each link reaches that screen

### Requirement: The server delivers the application shell for every path

The server SHALL serve the application shell for any path, including a path no route matches, and SHALL NOT answer an unknown path as a missing resource. The browser SHALL render the failure page for a path its router cannot match. The former `/analytics` path SHALL redirect to `/monthly` so an existing link reaches the replacement screen. The former `/monthly-totals` path SHALL redirect to `/yearly` and SHALL preserve its query so an existing link reaches the replacement screen.

#### Scenario: An unknown route is the failure page

- **WHEN** a path other than a defined route is requested
- **THEN** the application shell is delivered for that path, and the browser renders the failure page because its router matches no route, without the server reporting the path as missing

#### Scenario: The former analytics route redirects

- **WHEN** the `/analytics` path is requested
- **THEN** the browser reaches `/monthly` and presents the monthly category overview

#### Scenario: The former monthly totals route redirects

- **WHEN** the `/monthly-totals` path is requested with or without a query
- **THEN** the browser reaches `/yearly` with the same query and presents the Yearly category-by-month matrix

### Requirement: Amounts are never distinguished by color

The system SHALL present every euro amount in the theme's ink color. It SHALL NOT encode an amount's sign or category membership as a color: a negative amount SHALL be distinguished only by the sign that `euro-value-display` requires it to be shown with, and the failure color SHALL NOT be applied to an amount. The Yearly category-by-month matrix MAY tint a month cell's background by the cell's magnitude relative to its row; the amount text SHALL remain ink and the exact value SHALL remain present, so colour is not the only carrier.

#### Scenario: A negative amount is ink-colored

- **WHEN** a transaction amount or a derived total is negative
- **THEN** it is rendered in ink with its sign, not in a warning or failure color

#### Scenario: A category's amount is ink-colored

- **WHEN** an amount belongs to a category
- **THEN** the amount text remains ink-colored, and only the category's own indicator carries the category color

#### Scenario: The failure color never marks an amount

- **WHEN** any amount, including a large negative sum, is displayed
- **THEN** it does not use the failure color

#### Scenario: The Yearly matrix may tint by magnitude

- **WHEN** the Yearly matrix renders a populated month cell
- **THEN** the cell's background may carry a row-relative magnitude tint, while its amount text remains ink and its exact value remains present

#### Scenario: The Yearly tint is not the only carrier

- **WHEN** a tinted Yearly cell is inspected
- **THEN** the exact amount is readable in ink without relying on the tint

### Requirement: The application renders with one themed palette

The system SHALL define the application's palette once as theme tokens with explicit roles: a paper ground, a surface, ink and muted text, rules, a failure color, and a brand color with a soft companion. Every route, including the failure page, SHALL render with those roles. The brand role SHALL identify the shared menu bar, the current navigation link, primary actions, and selection controls. Colour in content SHALL identify categories, mark failures, or mark destructive actions: the system SHALL NOT apply decorative accent colours to content controls beyond the brand roles named above, and the failure color SHALL be used only for failures and destructive actions. The Yearly matrix's row-relative magnitude tint is the one permitted content colour that identifies neither a category nor a failure; it uses the brand role at varying strength and never replaces the exact ink amount.

#### Scenario: Every route renders with the theme's roles

- **WHEN** any route, including the failure page, is delivered
- **THEN** its ground, surfaces, text, rules, and controls resolve to the theme's role tokens rather than to per-screen values

#### Scenario: The brand role marks the navigation and primary actions

- **WHEN** the shared menu bar, the current navigation link, a primary action, or a selection control is rendered
- **THEN** it uses the theme's brand roles, and no per-screen colour is introduced

#### Scenario: Category colors come from the one category palette

- **WHEN** categories are shown in a chart, a totals list, or a row indicator
- **THEN** each category's color comes from the single application category palette

#### Scenario: The failure color marks failures and destructive actions

- **WHEN** a failure is presented, such as a failed import run, a form error, or the failure page
- **THEN** it uses the failure color; **WHEN** a destructive action such as deleting a category is presented, it may use the failure color; **WHEN** content is neither a failure nor a destructive action, no element uses that color

#### Scenario: Controls are not accent-colored

- **WHEN** a button, link, filter, or select that is not the shared navigation, a primary action, or a selection control is rendered
- **THEN** its resting, hover, and focus states use the theme's ink, muted, and rule values rather than the brand hue

#### Scenario: The Yearly tint is the one magnitude exception

- **WHEN** a populated Yearly month cell is rendered with a magnitude tint
- **THEN** the tint uses the brand role at varying strength, the exact amount remains ink, and no other content uses colour to encode magnitude

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
- **THEN** it shows one link each for Transactions, Categories, People, Monthly, Yearly, Monthly average, and Imports, and no other destination

#### Scenario: The current screen is distinguishable

- **WHEN** a route is shown
- **THEN** its menu link is marked as current and is visually distinct from the other links by more than its hue

#### Scenario: The current screen follows navigation

- **WHEN** the user follows a menu link to another screen
- **THEN** the newly shown screen's link becomes the current one and the previous link loses that distinction

#### Scenario: Narrow viewports keep the disclosure

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the labelled disclosure control remains available, exposes the same seven links, and keeps its expanded state available to assistive technology
