# Spec Delta

## ADDED Requirements

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

### Requirement: The shared masthead uses the design's type and size scale

The system SHALL render the masthead wordmark at 20px and weight 800, desktop navigation links at 14px and weight 600 with 10px vertical and 16px horizontal padding, and mobile navigation links at 15px and weight 600 with a 12px corner radius and a hit area at least 48px high. The menu bar SHALL use 14px vertical padding on desktop and 14px top with 12px bottom padding on mobile.

#### Scenario: Desktop masthead metrics

- **WHEN** the menu bar is rendered at a desktop width
- **THEN** the wordmark computes to 20px and 800 weight, and each navigation link computes to 14px and 600 weight with the design's padding

#### Scenario: Mobile masthead metrics

- **WHEN** the menu bar is rendered at a mobile width
- **THEN** the wordmark remains 20px and 800 weight, each navigation link computes to 15px and 600 weight, and each link is at least 48px high with 12px corners

### Requirement: The shared main frame is bounded and padded to the design

The system SHALL centre the shared main content frame at a maximum width of 1280px. The frame SHALL use 32px top, 40px horizontal, and 64px bottom padding at desktop widths, and 20px top, 16px horizontal, and 32px bottom padding at mobile widths. The frame SHALL remain within the viewport at every supported width and SHALL NOT introduce page-level horizontal overflow.

#### Scenario: Desktop frame is bounded

- **WHEN** a route is rendered in a viewport wider than 1280px
- **THEN** the main frame is no wider than 1280px, is horizontally centred, and uses the design's desktop padding

#### Scenario: Mobile frame fits the viewport

- **WHEN** a route is rendered at a phone width
- **THEN** the main frame uses the design's mobile padding and the page has no horizontal overflow outside an intentional table scroll region

## MODIFIED Requirements

### Requirement: Content surfaces are sheets separated by rules

The system SHALL separate content with the surface color over the paper ground. Related content MAY be grouped on a rounded surface sheet, and the Transactions screen SHALL group its filters and its table on separate sheets. Apart from a subtle resting shadow on those two Transactions sheets, the system SHALL NOT use decorative shadows on content panels and SHALL NOT render identical bordered cards for every panel. Stronger elevation SHALL be reserved for elements that float above content, such as the fixed action bars.

#### Scenario: Transactions content is grouped on sheets

- **WHEN** the Transactions screen is rendered
- **THEN** its filter controls and its table are each presented on a rounded surface sheet over the paper ground

#### Scenario: Transactions sheets may rest elevated

- **WHEN** the Transactions filter and table sheets are rendered at a desktop width
- **THEN** each carries a subtle resting shadow rather than relying only on the surface-over-paper distinction

#### Scenario: Panels are not shadowed cards

- **WHEN** chart panels, list panels, or any content panel other than the Transactions filter and table sheets is rendered
- **THEN** it is separated by rules and the surface-over-paper distinction, with no decorative shadow

#### Scenario: Floating elements may elevate

- **WHEN** the transactions screen shows its fixed action bars
- **THEN** those bars may carry a stronger shadow because they float above the table
