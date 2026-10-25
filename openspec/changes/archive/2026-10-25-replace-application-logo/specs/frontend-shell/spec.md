# Spec Delta

## MODIFIED Requirements

### Requirement: The document carries the application's installable identity

The system SHALL serve an installable identity from its own origin: an opaque 180×180 PNG icon at
`/apple-touch-icon.png`, and a web app manifest at `/site.webmanifest` that names the application,
references 192×192 and 512×512 PNG icons, and sets the paper and ink theme colours. The document
SHALL link both. The manifest SHALL NOT declare a standalone display, so an installed shortcut
launches in the browser. The icon artwork SHALL be the application's four-wedge logo mark on a
full-bleed brand-gradient ground.

#### Scenario: A home screen shows the application's own icon and label

- **WHEN** the application is added to a device's home screen
- **THEN** it is represented by the application's four-wedge logo mark and labelled `Expenses`

#### Scenario: The touch icon is opaque and full bleed

- **WHEN** `/apple-touch-icon.png` is fetched
- **THEN** it answers with an image that is 180×180 pixels, carries no transparency, fills a square ground edge to edge, and shows the four-wedge mark on the brand gradient

#### Scenario: The manifest names the application and its icons resolve

- **WHEN** `/site.webmanifest` is fetched
- **THEN** it parses as JSON, names the application `Expenses`, and lists 192×192 and 512×512 PNG icon entries whose files answer with an image

#### Scenario: An installed shortcut keeps the browser launch

- **WHEN** the manifest is read
- **THEN** it declares no standalone display mode

#### Scenario: The tab carries the application's mark

- **WHEN** the delivered document is inspected
- **THEN** it links an icon for the browser tab, and that icon resolves from the application's own origin

#### Scenario: The vector icon carries the new mark

- **WHEN** `/icon.svg` is fetched
- **THEN** it answers as an SVG showing the four-wedge logo mark on a full-bleed brand-gradient ground

#### Scenario: No icon or manifest request leaves the application

- **WHEN** the delivered document and its assets are inspected, and the page is used
- **THEN** the icon, manifest, theme colour, and favicon requests are served by the application itself, with no request to another origin


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
- **THEN** it shows one link each for Transactions, Categories, People, Analytics, Monthly totals, Monthly average, and Imports, and no other destination

#### Scenario: The current screen is distinguishable

- **WHEN** a route is shown
- **THEN** its menu link is marked as current and is visually distinct from the other links by more than its hue

#### Scenario: The current screen follows navigation

- **WHEN** the user follows a menu link to another screen
- **THEN** the newly shown screen's link becomes the current one and the previous link loses that distinction

#### Scenario: Narrow viewports keep the disclosure

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the labelled disclosure control remains available, exposes the same seven links, and keeps its expanded state available to assistive technology
