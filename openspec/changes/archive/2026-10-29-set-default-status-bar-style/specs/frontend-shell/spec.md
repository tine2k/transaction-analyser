# Spec Delta

## MODIFIED Requirements

### Requirement: The document carries the application's installable identity

The system SHALL serve an installable identity from its own origin: an opaque 180×180 PNG icon at
`/apple-touch-icon.png`, and a web app manifest at `/site.webmanifest` that names the application,
references 192×192 and 512×512 PNG icons, sets the brand bar's start colour as the theme colour,
sets the paper ground as the background colour, and declares a standalone display. The document
SHALL link both, and SHALL declare the application capable of a standalone launch with the
default status bar style. The icon artwork SHALL be the application's four-wedge logo mark on a
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

#### Scenario: An installed shortcut launches without browser chrome

- **WHEN** the manifest and the delivered document are read
- **THEN** the manifest declares a standalone display, and the document declares the mobile-web-app capability, the Apple mobile-web-app capability, and an `apple-mobile-web-app-status-bar-style` metadata value of `default`

#### Scenario: An installed shortcut keeps the browser launch

- **WHEN** an installed shortcut is launched on a browser that does not support a standalone display
- **THEN** it keeps the browser launch, and the dark theme colour keeps the surface above the masthead dark

#### Scenario: A browser tab still opens normally

- **WHEN** a route is opened at its URL in a browser tab
- **THEN** it renders with the browser's own chrome, because the standalone declaration only changes an installed launch

#### Scenario: The tab carries the application's mark

- **WHEN** the delivered document is inspected
- **THEN** it links an icon for the browser tab, and that icon resolves from the application's own origin

#### Scenario: The vector icon carries the new mark

- **WHEN** `/icon.svg` is fetched
- **THEN** it answers as an SVG showing the four-wedge logo mark on a full-bleed brand-gradient ground

#### Scenario: No icon or manifest request leaves the application

- **WHEN** the delivered document and its assets are inspected, and the page is used
- **THEN** the icon, manifest, theme colour, and favicon requests are served by the application itself, with no request to another origin
