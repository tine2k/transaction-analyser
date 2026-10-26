# Spec Delta

## ADDED Requirements

### Requirement: The application serves the eight browser routes

The system SHALL provide browser routes at `/` for the transactions table, `/categories` for category management, `/people`, `/monthly` for the monthly category overview, `/yearly` for the yearly category-by-month matrix, `/monthly-average`, `/imports` for the import log, and `/manage` for the management hub, each presenting the screen defined by its capability. All routes SHALL be rendered by the browser rather than by the server.

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

#### Scenario: The manage route presents the hub

- **WHEN** the `/manage` route is requested
- **THEN** a page is delivered that presents the management hub

#### Scenario: Each menu destination reaches its screen

- **WHEN** a menu destination is followed
- **THEN** its screen is reached

#### Scenario: The management screens are reached from the hub

- **WHEN** the category, people, or imports entry in the manage hub is followed
- **THEN** its screen is reached

## MODIFIED Requirements

### Requirement: Every route names itself in the browser tab

The document title SHALL name the screen shown, then the application: `Transactions · Expenses` for `/`, `Categories · Expenses`, `People · Expenses`, `Monthly · Expenses`, `Yearly · Expenses`, `Monthly average · Expenses`, `Imports · Expenses`, and `Manage · Expenses` for `/manage`. A page that names no screen SHALL show `Expenses` alone.

#### Scenario: The transactions route names itself

- **WHEN** `/` is shown
- **THEN** the document title is `Transactions · Expenses`

#### Scenario: Each named route names itself

- **WHEN** `/categories`, `/people`, `/monthly`, `/yearly`, `/monthly-average`, `/imports`, or `/manage` is shown
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

### Requirement: The menu bar carries the application's identity and the current screen

The shared menu bar SHALL present the application's logo mark immediately to the left of the application name `Expenses`, and one visibly labelled link for each of the five bar destinations: Transactions, Monthly, Yearly, Monthly average, and Manage. The mark SHALL be decorative: it SHALL NOT be a link or a control, SHALL NOT carry an accessible name of its own, and SHALL NOT change the name a screen reader reads for the application. The current destination SHALL be distinguishable without relying on colour alone, with Manage standing in for the manage hub and the category, people, and import screens. The bar SHALL NOT introduce a destination beyond the five. On narrow viewports the bar SHALL keep a labelled disclosure control for the same five links and SHALL keep the mark beside the name.

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

- **WHEN** the menu bar and the screens that reach the management screens are rendered
- **THEN** the bar shows one labelled link each for Transactions, Monthly, Yearly, Monthly average, and Manage and no other destination, the transactions screen carries a labelled link to Categories, and the manage hub carries labelled links to People, Categories, and Imports

#### Scenario: The current screen is distinguishable

- **WHEN** any route is shown
- **THEN** its bar destination is marked as current, with Manage standing in for `/manage`, `/categories`, `/people`, and `/imports`, and is visually distinct from the other links by more than its hue

#### Scenario: The current screen follows navigation

- **WHEN** the user follows a bar destination or a manage-hub entry to another screen
- **THEN** the newly shown screen's destination becomes the current one, with Manage standing in for the hub and its screens, and the previous destination loses that distinction

#### Scenario: Narrow viewports keep the disclosure

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the labelled disclosure control remains available, exposes the same five links, and keeps its expanded state available to assistive technology

## REMOVED Requirements

### Requirement: The application serves the seven browser routes

**Reason**: The bar no longer presents all routes. Three screens moved behind the Manage hub and the Transactions screen, and a new `/manage` route was added, so the old seven-route contract and its menu-bar reachability scenario no longer describe the application.

**Migration**: Use `The application serves the eight browser routes` and the modified `The menu bar carries the application's identity and the current screen` in this delta.
