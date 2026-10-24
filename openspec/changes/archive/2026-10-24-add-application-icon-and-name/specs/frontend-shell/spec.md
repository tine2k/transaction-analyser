# Spec Delta

## ADDED Requirements

### Requirement: The application names itself Expenses wherever a person reads it

The system SHALL present the application's name as `Expenses` in the frame's masthead, in the document
title, in the web app manifest, in the home-screen label, and in the fixed Pushover test message. It
SHALL NOT present `Transaction Analyser` to a person. The repository, container image, container and
volume names, database name, and package name SHALL keep the project name.

#### Scenario: The masthead reads Expenses

- **WHEN** any route, including the failure page, is rendered
- **THEN** the masthead names the application `Expenses`

#### Scenario: No screen shows the project name

- **WHEN** any route is rendered and its document is inspected
- **THEN** the document names the application `Expenses` and nowhere presents `Transaction Analyser`

#### Scenario: The test notification names the application

- **WHEN** the imports screen sends the fixed Pushover test message
- **THEN** the message text names the application `Expenses`

#### Scenario: The project keeps its own name

- **WHEN** the repository, container image, container names, database name, or package name is inspected
- **THEN** it carries the project name rather than `Expenses`

### Requirement: The document carries the application's installable identity

The system SHALL serve an installable identity from its own origin: an opaque 180×180 PNG icon at
`/apple-touch-icon.png`, and a web app manifest at `/site.webmanifest` that names the application,
references 192×192 and 512×512 PNG icons, and sets the paper and ink theme colours. The document
SHALL link both. The manifest SHALL NOT declare a standalone display, so an installed shortcut
launches in the browser.

#### Scenario: A home screen shows the application's own icon and label

- **WHEN** the application is added to a device's home screen
- **THEN** it is represented by the application's pie-chart icon and labelled `Expenses`

#### Scenario: The touch icon is opaque and full bleed

- **WHEN** `/apple-touch-icon.png` is fetched
- **THEN** it answers with an image that is 180×180 pixels, carries no transparency, and fills a square ground edge to edge

#### Scenario: The manifest names the application and its icons resolve

- **WHEN** `/site.webmanifest` is fetched
- **THEN** it parses as JSON, names the application `Expenses`, and lists 192×192 and 512×512 PNG icon entries whose files answer with an image

#### Scenario: An installed shortcut keeps the browser launch

- **WHEN** the manifest is read
- **THEN** it declares no standalone display mode

#### Scenario: The tab carries the application's mark

- **WHEN** the delivered document is inspected
- **THEN** it links an icon for the browser tab, and that icon resolves from the application's own origin

#### Scenario: No icon or manifest request leaves the application

- **WHEN** the delivered document and its assets are inspected, and the page is used
- **THEN** the icon, manifest, theme colour, and favicon requests are served by the application itself, with no request to another origin

### Requirement: Every route names itself in the browser tab

The document title SHALL name the screen shown, then the application: `Transactions · Expenses` for
`/`, `Categories · Expenses`, `Analytics · Expenses`, `Monthly totals · Expenses`,
`Monthly average · Expenses`, and `Imports · Expenses`. A page that names no screen SHALL show
`Expenses` alone.

#### Scenario: The transactions route names itself

- **WHEN** `/` is shown
- **THEN** the document title is `Transactions · Expenses`

#### Scenario: Each named route names itself

- **WHEN** `/categories`, `/analytics`, `/monthly-totals`, `/monthly-average`, or `/imports` is shown
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
