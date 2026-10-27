# Spec Delta

## MODIFIED Requirements

### Requirement: The document carries the application's installable identity

The system SHALL serve an installable identity from its own origin: an opaque 180×180 PNG icon at
`/apple-touch-icon.png`, and a web app manifest at `/site.webmanifest` that names the application,
references 192×192 and 512×512 PNG icons, sets the brand bar's start colour as the theme colour,
sets the paper ground as the background colour, and declares a standalone display. The document
SHALL link both, and SHALL declare the application capable of a standalone launch with a
translucent status bar. The icon artwork SHALL be the application's four-wedge logo mark on a
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
- **THEN** the manifest declares a standalone display, and the document declares the mobile-web-app capability, the Apple mobile-web-app capability, and a translucent Apple status bar

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

### Requirement: The page ground is the lavender paper colour

The system SHALL render the page ground in `#e9e7f5` on every route, including the failure page, using the theme's paper role rather than a per-screen colour. The document's theme colour and the web app manifest's theme colour SHALL be `#101b5d`, the brand bar's start colour, so the surface above the masthead on a phone is dark rather than a pale band. The manifest's background colour SHALL be `#e9e7f5`.

#### Scenario: Every route uses the lavender ground

- **WHEN** any route, including the failure page, is rendered
- **THEN** the page ground computes to `#e9e7f5`

#### Scenario: The install surface matches the ground

- **WHEN** the delivered document and the web app manifest are inspected
- **THEN** the manifest's background colour is `#e9e7f5`, matching the page ground

#### Scenario: The phone top surface matches the masthead

- **WHEN** the delivered document and the web app manifest are inspected
- **THEN** the document's theme colour and the manifest's theme colour are `#101b5d`

#### Scenario: Text on the ground stays legible

- **WHEN** body or muted text is rendered directly on the page ground
- **THEN** its contrast against the ground is at least 4.5:1

## ADDED Requirements

### Requirement: The installed app fills the phone screen

When running as an installed app on a phone, the system SHALL cover the whole screen, and the shared brand bar SHALL paint its brand gradient through the top safe area. The wordmark, navigation, and disclosure control SHALL stay below the status bar and notch, and the shared frame SHALL inset its content from a landscape notch. With no safe-area inset, the frame and header spacing SHALL stay as they are.

#### Scenario: The installed viewport covers the screen

- **WHEN** the delivered document is inspected
- **THEN** its viewport metadata contains `viewport-fit=cover`

#### Scenario: The brand gradient reaches the top edge

- **WHEN** the app runs standalone with a top safe-area inset
- **THEN** the brand bar's background starts at the viewport's top edge and carries the brand gradient

#### Scenario: The header content clears the status bar

- **WHEN** a top safe-area inset is present
- **THEN** the wordmark, navigation links, and disclosure control begin at or below that inset

#### Scenario: A landscape notch does not overlap the frame

- **WHEN** a left or right safe-area inset is present
- **THEN** the header's and main frame's content are inset by at least that amount

#### Scenario: No inset leaves the frame unchanged

- **WHEN** all safe-area insets are zero
- **THEN** the header keeps its 14px top and 12px bottom content padding, and the frame keeps its 16px phone and 40px desktop horizontal padding and its 32px phone and 64px desktop bottom padding

### Requirement: Fixed action bars clear the home indicator

The fixed transaction action bars SHALL extend their surface through the phone's bottom safe area while keeping their controls above it. With no bottom inset, the bars SHALL keep their existing 12px top and bottom padding.

#### Scenario: The bar surface covers the bottom safe area

- **WHEN** a bottom safe-area inset is present
- **THEN** the fixed bar's surface reaches the viewport's bottom edge

#### Scenario: The controls stay above the home indicator

- **WHEN** a bottom safe-area inset is present
- **THEN** every control in the fixed bar sits above that inset

#### Scenario: No inset keeps the existing bar

- **WHEN** the bottom safe-area inset is zero
- **THEN** the bar keeps its 12px top and bottom padding
