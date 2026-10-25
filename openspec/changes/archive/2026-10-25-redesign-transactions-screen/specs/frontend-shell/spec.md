# Spec Delta

## ADDED Requirements

### Requirement: The menu bar carries the application's identity and the current screen

The shared menu bar SHALL present the application name `Expenses` and one visibly labelled link for each of the seven routes. The link for the current route SHALL be distinguishable without relying on colour alone. The bar SHALL NOT introduce a destination beyond the seven routes. On narrow viewports the bar SHALL keep a labelled disclosure control for the same links.

#### Scenario: The bar names the application

- **WHEN** any route is rendered
- **THEN** the shared menu bar shows the application name `Expenses`

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

## MODIFIED Requirements

### Requirement: The application renders with one themed palette

The system SHALL define the application's palette once as theme tokens with explicit roles: a paper ground, a surface, ink and muted text, rules, a failure color, and a brand color with a soft companion. Every route, including the failure page, SHALL render with those roles. The brand role SHALL identify the shared menu bar, the current navigation link, primary actions, and selection controls. Colour in content SHALL identify categories, mark failures, or mark destructive actions: the system SHALL NOT apply decorative accent colours to content controls beyond the brand roles named above, and the failure color SHALL be used only for failures and destructive actions.

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

### Requirement: Content surfaces are sheets separated by rules

The system SHALL separate content with the surface color over the paper ground. Related content MAY be grouped on a rounded surface sheet, and the Transactions screen SHALL group its filters and its table on separate sheets. The system SHALL NOT use decorative shadows or identical bordered cards for every panel. Elevation SHALL be reserved for elements that float above content, such as the fixed action bars on the transactions screen.

#### Scenario: Transactions content is grouped on sheets

- **WHEN** the Transactions screen is rendered
- **THEN** its filter controls and its table are each presented on a rounded surface sheet over the paper ground

#### Scenario: Panels are not shadowed cards

- **WHEN** chart panels or list panels are rendered
- **THEN** they are separated by rules and the surface-over-paper distinction, with no decorative shadow

#### Scenario: Floating elements may elevate

- **WHEN** the transactions screen shows its fixed action bars
- **THEN** those bars may carry a shadow because they float above the table
