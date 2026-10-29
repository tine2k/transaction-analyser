# Frontend Shell Specification

## Purpose

Defines the browser half of the application: that every route renders inside one default layout, that the only route is an index route holding placeholder text, that a failure renders a defined page rather than a blank screen, that styling arrives through one stylesheet with no component library, and that the browser is never given a database address and reaches the server only through the same-origin API.

## Requirements

### Requirement: Every route renders inside one default layout

The system SHALL render every route inside one default layout, which supplies the application's frame: the document's shared metadata, the page container, and the shared heading area. No route SHALL be able to render outside that layout. The layout SHALL apply to the failure page as well as to the routes, so that a failure is presented in the same frame as a successful page. The system SHALL NOT add a second layout, and SHALL NOT let a route opt out of the default one. The frame's page container and the masthead's inner content SHALL span the full width of the viewport, and SHALL NOT constrain themselves to a centered maximum-width column, so that the frame uses the horizontal room a large display provides. The frame SHALL use 32px top, 40px horizontal, and 64px bottom padding at desktop widths, and 20px top, 16px horizontal, and 32px bottom padding at phone widths, so its content is not flush against the viewport edge. The frame SHALL remain within the viewport at every supported width and SHALL NOT introduce page-level horizontal overflow.

#### Scenario: A route renders inside the frame

- **WHEN** the index route is requested
- **THEN** the response contains the shared frame with the page's content inside it

#### Scenario: The failure page uses the same frame

- **WHEN** a request fails, or names a route that does not exist
- **THEN** the failure page is delivered inside the same frame as a successful page

#### Scenario: There is exactly one layout and no route escapes it

- **WHEN** the application's layouts and routes are inspected
- **THEN** exactly one layout is defined, it is the one every route renders in, and no route declares that it renders without it

#### Scenario: The frame spans the viewport width

- **WHEN** a route is rendered on a display wider than the frame's content
- **THEN** the frame's container and the masthead's inner content extend to the full width of the viewport rather than stopping at a centered maximum-width column, with only the named padding inset between the content and the viewport edge

#### Scenario: Desktop and phone padding follow the design

- **WHEN** a route is rendered at a desktop width and again at a phone width
- **THEN** the frame uses 32px top, 40px horizontal, and 64px bottom padding on desktop, and 20px top, 16px horizontal, and 32px bottom padding on the phone

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

### Requirement: The browser assembles every route's content

The delivered document SHALL carry the application shell rather than the data, and each screen's content SHALL be assembled by the browser once it has run. A route SHALL NOT show invented data presented as though it were the user's own.

#### Scenario: The browser assembles the rows

- **WHEN** a route is requested and its endpoint returns data
- **THEN** the delivered document carries the application shell rather than the data, and the screen is assembled by the browser once it has run, so the browser has to run the application to reveal it

#### Scenario: Nothing is invented to fill the page

- **WHEN** a route is rendered
- **THEN** only data the read endpoints returned is shown, and no transaction, person, category, amount, or import run is shown as an example

### Requirement: Styling arrives through one stylesheet, with no component library

The system SHALL load one stylesheet as part of the application, and that stylesheet SHALL
provide the utility classes the templates use, so that a class written in any template is styled.
The stylesheet SHALL define the application's theme as design tokens, and those tokens SHALL be
the single source for the palette, type, radius, and surface values the templates use.
The stylesheet SHALL apply to the failure page as well as to the routes. The system SHALL NOT add
a general-purpose prebuilt component library, design system, or headless component kit, and
SHALL NOT hand-write a second global stylesheet beside the utility one. The system SHALL use at
most one icon package, imported as tree-shaken components and delivered from the application's
own assets; it SHALL NOT use an icon font, a runtime icon service, or a second icon family.
Icons SHALL be decorative: a navigation link or action control that carries an icon SHALL keep
its visible text label, and a control that shows an icon without a visible label SHALL carry an
accessible name. A charting library MAY be used solely to render the category spending
visualization.

#### Scenario: A utility class is styled

- **WHEN** a template uses a class the stylesheet defines
- **THEN** the delivered page carries the styling that class names

#### Scenario: Templates take their values from the theme

- **WHEN** any route is rendered
- **THEN** its colors, type, and surfaces resolve to the theme tokens defined in the one stylesheet

#### Scenario: The failure page is styled by the same stylesheet

- **WHEN** the failure page is delivered
- **THEN** it is styled by the same stylesheet as every other route, with no separate styling of its own

#### Scenario: No component library is present

- **WHEN** the project's dependencies are inspected
- **THEN** no general-purpose component library, design system, headless component kit, icon font, or second icon family is present, at most one icon package is among them, and the charting library may be used only for the category spending visualization

#### Scenario: Icons accompany visible text

- **WHEN** a navigation link or an action control carrying an icon is rendered
- **THEN** the control still shows its text label, and the icon is exposed as decorative rather than as the control's only name

#### Scenario: A standalone icon control is named

- **WHEN** a control shows an icon without a visible text label
- **THEN** it carries an accessible name

#### Scenario: Icons come from the application's own assets

- **WHEN** the delivered page and its assets are inspected, and the page is used
- **THEN** icons are delivered by the application itself, with no request to another origin for an icon

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

### Requirement: Category colours have a stable identity

The system SHALL assign every stored category one home colour derived from its persistent identity. The home colour SHALL NOT depend on the other categories present, the screen, filters, sort order, or the category's name.

#### Scenario: A category keeps its home colour across screens

- **WHEN** the same category is shown on the Transactions, Monthly, Yearly, or Monthly average screen
- **THEN** its category mark uses the same home colour family on every screen

#### Scenario: Changing the category set keeps existing home colours

- **WHEN** a category is added, removed, or renamed while another category keeps its identity
- **THEN** the unchanged category keeps the home colour it had before

#### Scenario: Filters keep home colours

- **WHEN** the selected month, year, person, expense type, or uncategorised visibility changes
- **THEN** every visible category keeps its home colour

#### Scenario: Uncategorised is not a stored category

- **WHEN** an uncategorised entry is shown on the Transactions screen
- **THEN** its pill remains neutral and is not presented as a stored category with a home colour

### Requirement: The category palette defines three roles

The system SHALL define the category palette as twenty colour families, each with a main role for category marks, a tint role for pill grounds, and an ink role for pill text.

#### Scenario: A category mark uses the main role

- **WHEN** a category dot, bar segment, legend swatch, or share bar is rendered
- **THEN** its fill uses the main role of the category's home colour family

#### Scenario: A category pill uses the tint and ink roles

- **WHEN** a categorised category pill is rendered
- **THEN** its ground uses the tint role and its text uses the ink role of the category's home colour family

### Requirement: Category marks meet a contrast floor

The system SHALL draw every category mark — dot, bar segment, legend swatch, or share bar — from the single application category palette and SHALL give it at least 3:1 contrast against the surface it is drawn on. A category pill SHALL use a palette tint ground and palette ink text, and its text SHALL have at least 4.5:1 contrast against its ground. The pill's ground is background and is not required to meet 3:1 because the visible label carries the category identity.

#### Scenario: A category indicator has non-text contrast

- **WHEN** a category dot, bar segment, legend swatch, or share bar is rendered
- **THEN** its colour has at least 3:1 contrast against the surface behind it

#### Scenario: A category pill's text is legible

- **WHEN** a category pill carrying a palette colour is rendered
- **THEN** its text has at least 4.5:1 contrast against the pill's ground and the category name remains present

#### Scenario: The pastel pill ground is not the only identifier

- **WHEN** a category pill's tint ground is lighter than 3:1 against the surface
- **THEN** the visible category name and ink text still identify the category, and no category is conveyed by colour alone

### Requirement: Type is set in three roles

The system SHALL set the application masthead and page titles in a display weight of the sans-serif family, interface and tabular content in that sans-serif family, and machine-generated strings shown to the user — category patterns, counterparty accounts, and import timestamps — in a monospaced face. The display role SHALL use a heavier weight and tighter spacing than interface text. The faces SHALL be served from the application's own origin. Amounts and counts SHALL be set with tabular figures.

#### Scenario: Titles use the display face

- **WHEN** a route is rendered
- **THEN** the application masthead and the page title are set in the sans-serif display role, not in a serif face

#### Scenario: Interface content uses the sans-serif family

- **WHEN** a table, filter, or action control is rendered
- **THEN** its text uses the same sans-serif family as the display role

#### Scenario: Machine strings use the monospaced face

- **WHEN** a category pattern, a counterparty account, or an import timestamp is shown
- **THEN** it is set in the monospaced face

#### Scenario: Figures align

- **WHEN** amounts or counts are displayed in a column or an aligned list
- **THEN** they use tabular figures

#### Scenario: Faces load from the application's own origin

- **WHEN** the delivered page and its assets are inspected
- **THEN** the typefaces are served by the application itself, with no request to another origin

### Requirement: The interface and display face is Plus Jakarta Sans

The system SHALL self-host Plus Jakarta Sans and use it for the masthead, page titles, interface text, tables, and controls, with display text using the family's heavier weights up to 800. Machine-generated strings — category patterns, counterparty accounts, and import timestamps — SHALL remain in the monospaced face. No request for these faces SHALL leave the application's origin.

#### Scenario: Interface text uses Plus Jakarta Sans

- **WHEN** the computed type of a table cell, filter label, or control is inspected
- **THEN** its font family resolves to Plus Jakarta Sans before any generic fallback

#### Scenario: Display text uses the heaviest weight

- **WHEN** the masthead wordmark or a page title is inspected
- **THEN** its computed font weight is 800 and its letter spacing is tighter than interface text

#### Scenario: Machine strings stay monospaced

- **WHEN** a category pattern, a counterparty account, or an import timestamp is shown
- **THEN** it remains set in the monospaced face

#### Scenario: Faces load from the application's own origin

- **WHEN** the delivered page and its assets are inspected
- **THEN** the Plus Jakarta Sans faces are served by the application itself, cover weights 400 through 800, and make no request to another origin

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

### Requirement: Every content surface rests elevated

The system SHALL render every content surface region — filter groups, table regions, summary figures, list panels, form panels, and the Transactions filter and table sheets — with the theme's resting shadow at every viewport width. It SHALL NOT render a content surface region without that resting shadow.

#### Scenario: Every content surface rests elevated

- **WHEN** any content surface region is rendered at a phone, tablet, or desktop width
- **THEN** its computed box shadow is the theme's resting shadow

#### Scenario: Transactions sheets may rest elevated

- **WHEN** the Transactions filter and table sheets are rendered at a desktop width
- **THEN** each carries a subtle resting shadow rather than relying only on the surface-over-paper distinction

#### Scenario: Summary figures are cards

- **WHEN** the Monthly or Yearly summary figures are rendered
- **THEN** each is a surface region carrying the theme's resting shadow

### Requirement: Content surfaces sit on the paper ground

The system SHALL separate content with the surface color over the paper ground. Related content MAY be grouped on a rounded surface region, and the Transactions screen SHALL group its filters and its table on separate sheets. Stronger elevation SHALL be reserved for elements that float above content, such as the fixed action bars.

#### Scenario: Transactions content is grouped on sheets

- **WHEN** the Transactions screen is rendered
- **THEN** its filter controls and its table are each presented on a rounded surface sheet over the paper ground

#### Scenario: Floating elements may elevate

- **WHEN** the application shows a fixed action bar that floats above content
- **THEN** that bar may carry a stronger shadow than the resting surface shadow

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

### Requirement: Content surfaces carry the card border

The system SHALL draw every content surface region as a white card with a 1px `#d3cfea` border in addition to its resting shadow. This covers filter groups, chart panels, table regions, summary figures, list panels, form panels, and the phone transaction cards. Floating action bars SHALL NOT be card surfaces.

#### Scenario: Every content surface is a bordered card

- **WHEN** any content surface region is rendered at a phone, tablet, or desktop width
- **THEN** its computed background is `#ffffff`, its border is 1px solid `#d3cfea`, and it still carries the resting shadow

#### Scenario: The border does not replace elevation

- **WHEN** a content surface card is inspected
- **THEN** its computed box shadow remains the theme's resting shadow

#### Scenario: Floating action bars are not cards

- **WHEN** a fixed action bar is shown
- **THEN** it carries no card border and keeps its stronger upward shadow

### Requirement: Content surfaces use the panel corner radius

The system SHALL round every content surface card to the theme's panel corner radius of 20px. A surface that already defines an 18px phone radius SHALL keep that radius at phone widths.

#### Scenario: Cards use the panel radius

- **WHEN** a content surface card is rendered at a tablet or desktop width
- **THEN** its corner radius is 20px

#### Scenario: Phone-only surfaces keep their phone radius

- **WHEN** a phone transaction card, or a Transactions sheet at a phone width, is rendered
- **THEN** its corner radius is 18px

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

The system SHALL NOT compute, derive, aggregate, or infer values about transactions or categories
except for the transaction page's filter counts: the total number of transactions returned by its
one read request and the number of those transactions whose category is null; the monthly category
overview's per-category sums of absolute transaction amounts for one selected calendar month, the
selected month's total of those absolute amounts, the selected month's included transaction count,
and the eight largest categories plus the remainder used by its stacked bar; the monthly category
totals table's per-category sums of absolute transaction amounts grouped by booking month for every
month represented by a transaction returned from the endpoint; and the monthly average page's
per-category monthly absolute totals within its configurable rolling window of recent booking
months, each category's exact window total and average, the page-wide average per month for the
current person and expense-type selection, and the person-scoped recurring and one-time monthly
averages. The transaction page MAY use category presence to select which returned rows to
display, but SHALL NOT alter the returned data or evaluate any category's regular expression. The
monthly category overview, monthly category totals table, and monthly average page MAY group and
aggregate the transactions returned by their single read request as their capabilities define. The
imports screen MAY display the run records the import log returns, without deriving a transaction
value from them. The browser SHALL NOT create, alter, or delete any stored data itself, and SHALL
NOT run a statement against the database. The browser MAY start the Easybank sync through the
sync-start endpoint, as `easybank-sync` defines; a run that request starts writes through the
server process and the shared import path, not through the browser, and the browser cannot change a
recorded run. The shell's relationship to stored data SHALL be through same-origin API requests:
stored data is read through read-only requests, and a write is requested through the category
management surface or the sync-start endpoint and is performed by the server, never by the browser
itself. The transaction table SHALL present
transaction values exactly as the endpoint returned them. Apart from the two transaction filter
counts, the selected view of returned transactions, the monthly figures defined by
`category-spending-chart`, `monthly-category-totals-table`, and `monthly-category-average`, and
the run records the import log returns, the shell SHALL NOT total, average, group, or otherwise
derive a value from transaction data for display.

#### Scenario: No category pattern is evaluated

- **WHEN** the application runs
- **THEN** no category's regular expression is evaluated by the browser, and no transaction is assigned a category by the browser

#### Scenario: Only the filter counts are derived from transactions

- **WHEN** the index route or the monthly route renders its transaction-derived values
- **THEN** the index route displays only the total returned transaction count and count with a null category, the monthly route displays only the selected month's absolute total, included transaction count, per-category absolute totals, and top-eight grouping defined by its capability, the monthly totals route displays only the per-month category absolute totals defined by its capability for months represented in returned transactions, and the monthly average route displays only the per-category monthly absolute totals, per-category window totals and averages, current-selection average per month, recurring average per month, and one-time average per month defined by its capability for the configured window

#### Scenario: Filtering does not alter returned values or data

- **WHEN** the user selects the uncategorised-only view
- **THEN** the page only chooses which returned transactions to show, presents their values unchanged, and writes no data

#### Scenario: The shell reads only through the read endpoint

- **WHEN** any screen obtains stored data
- **THEN** it does so through a same-origin read request to the endpoint for that data and runs no statement against the database itself

#### Scenario: No row is written

- **WHEN** the browser uses the application
- **THEN** no row is created, altered, or deleted by the browser itself, because a write is requested through the category management surface or the sync-start endpoint and the server performs it

#### Scenario: The category write is the server's

- **WHEN** a pattern is appended through the transaction shortcut
- **THEN** the browser sends the captured text in a same-origin request to the category management surface, evaluates no expression, and the server stores the pattern and applies the assignment

#### Scenario: The sync can be started from the imports screen

- **WHEN** the sync control on the imports screen is used
- **THEN** the browser makes a same-origin request to the sync-start endpoint, performs no retrieval and no write itself, and shows the outcome the endpoint returns

#### Scenario: The scheduled sync is the writer

- **WHEN** a sync run writes
- **THEN** it writes through the server process, not through the browser, and the browser cannot change what it writes

### Requirement: The menu bar carries the application's identity and the current screen

The shared menu bar SHALL present the application's logo mark immediately to the left of the application name `Expenses`, and one visibly labelled link for each of the five bar destinations: Transactions, Monthly, Yearly, Monthly average, and Manage. The mark SHALL be decorative: it SHALL NOT be a link or a control, SHALL NOT carry an accessible name of its own, and SHALL NOT change the name a screen reader reads for the application. The current destination SHALL be distinguishable without relying on colour alone, with Manage standing in for the manage hub and the category, people, and import screens. The bar SHALL NOT introduce a destination beyond the five. On narrow viewports the bar SHALL keep a labelled disclosure control for the same five links and SHALL keep the mark beside the name. On narrow viewports that disclosure control SHALL be the leading item of the masthead, placed before the mark and the name, while the mark remains immediately left of the name.

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

#### Scenario: The disclosure control leads the narrow-viewport masthead

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the disclosure control is the first item in the masthead and sits at its leading edge, before the logo mark and the `Expenses` wordmark, and the mark remains immediately left of the name

#### Scenario: The wide-screen masthead keeps its order

- **WHEN** the menu bar is rendered at a wide viewport width
- **THEN** no disclosure control is shown, the mark and name stay at the leading edge, and the five bar links remain directly visible

### Requirement: The shared masthead uses the design's type and size scale

The system SHALL render the masthead wordmark at 20px and weight 800, desktop navigation links at 14px and weight 600 with 10px vertical and 16px horizontal padding, and mobile navigation links at 15px and weight 600 with a 12px corner radius and a hit area at least 48px high. The menu bar SHALL use 14px vertical padding on desktop and 14px top with 12px bottom padding on mobile.

#### Scenario: Desktop masthead metrics

- **WHEN** the menu bar is rendered at a desktop width
- **THEN** the wordmark computes to 20px and 800 weight, and each navigation link computes to 14px and 600 weight with the design's padding

#### Scenario: Mobile masthead metrics

- **WHEN** the menu bar is rendered at a mobile width
- **THEN** the wordmark remains 20px and 800 weight, each navigation link computes to 15px and 600 weight, and each link is at least 48px high with 12px corners
