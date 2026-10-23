# Spec Delta

## MODIFIED Requirements

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
