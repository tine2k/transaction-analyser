# Spec Delta

## MODIFIED Requirements

### Requirement: Styling arrives through one stylesheet, with no component library

The system SHALL load one stylesheet as part of the application, and that stylesheet SHALL
provide the utility classes the templates use, so that a class written in any template is styled.
The stylesheet SHALL define the application's theme as design tokens, and those tokens SHALL be
the single source for the palette, type, radius, and surface values the templates use.
The stylesheet SHALL apply to the failure page as well as to the routes. The system SHALL NOT add
a general-purpose prebuilt component library, design system, icon set, or headless component kit,
and SHALL NOT hand-write a second global stylesheet beside the utility one. A charting library
MAY be used solely to render the category spending visualization.

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
- **THEN** no general-purpose component library, design system, icon set, or headless component kit is present, while a charting library may be used only for the category spending visualization

## ADDED Requirements

### Requirement: The application renders with one themed palette

The system SHALL define the application's palette once as theme tokens with explicit roles: a paper ground, a surface, ink and muted text, rules, and a failure color. Every route, including the failure page, SHALL render with those roles. Color in content SHALL identify categories, mark failures, or mark destructive actions: the system SHALL NOT apply decorative accent colors to controls, and the failure color SHALL be used only for failures and destructive actions.

#### Scenario: Every route renders with the theme's roles

- **WHEN** any route, including the failure page, is delivered
- **THEN** its ground, surfaces, text, rules, and controls resolve to the theme's role tokens rather than to per-screen values

#### Scenario: Category colors come from the one category palette

- **WHEN** categories are shown in a chart, a totals list, or a row indicator
- **THEN** each category's color comes from the single application category palette

#### Scenario: The failure color marks failures and destructive actions

- **WHEN** a failure is presented, such as a failed import run, a form error, or the failure page
- **THEN** it uses the failure color; **WHEN** a destructive action such as deleting a category is presented, it may use the failure color; **WHEN** content is neither a failure nor a destructive action, no element uses that color

#### Scenario: Controls are not accent-colored

- **WHEN** a button, link, filter, or select is rendered
- **THEN** its resting, hover, and focus states use the theme's ink, muted, and rule values rather than an accent hue

### Requirement: Type is set in three roles

The system SHALL set the application masthead and page titles in a serif display face, interface and tabular content in a sans-serif face, and machine-generated strings shown to the user — category patterns, counterparty accounts, and import timestamps — in a monospaced face. The faces SHALL be served from the application's own origin. Amounts and counts SHALL be set with tabular figures.

#### Scenario: Titles use the display face

- **WHEN** a route is rendered
- **THEN** the application masthead and the page title are set in the serif display face

#### Scenario: Machine strings use the monospaced face

- **WHEN** a category pattern, a counterparty account, or an import timestamp is shown
- **THEN** it is set in the monospaced face

#### Scenario: Figures align

- **WHEN** amounts or counts are displayed in a column or an aligned list
- **THEN** they use tabular figures

#### Scenario: Faces load from the application's own origin

- **WHEN** the delivered page and its assets are inspected
- **THEN** the typefaces are served by the application itself, with no request to another origin

### Requirement: Amounts are never distinguished by color

The system SHALL present every euro amount in the theme's ink color. It SHALL NOT encode an amount's sign, magnitude, or category membership as a color: a negative amount SHALL be distinguished only by the sign that `euro-value-display` requires it to be shown with, and the failure color SHALL NOT be applied to an amount.

#### Scenario: A negative amount is ink-colored

- **WHEN** a transaction amount or a derived total is negative
- **THEN** it is rendered in ink with its sign, not in a warning or failure color

#### Scenario: A category's amount is ink-colored

- **WHEN** an amount belongs to a category
- **THEN** the amount text remains ink-colored, and only the category's own indicator carries the category color

#### Scenario: The failure color never marks an amount

- **WHEN** any amount, including a large negative sum, is displayed
- **THEN** it does not use the failure color

### Requirement: Content surfaces are sheets separated by rules

The system SHALL separate content with the surface color over the paper ground, divided by theme rules, rather than with decorative shadows or identical bordered cards. Elevation SHALL be reserved for elements that float above content, such as the fixed action bars on the transactions screen.

#### Scenario: Panels are not shadowed cards

- **WHEN** chart panels or list panels are rendered
- **THEN** they are separated by rules and the surface-over-paper distinction, with no decorative shadow

#### Scenario: Floating elements may elevate

- **WHEN** the transactions screen shows its fixed action bars
- **THEN** those bars may carry a shadow because they float above the table
