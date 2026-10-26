# Spec Delta

## MODIFIED Requirements

### Requirement: Every screen remains usable at narrow viewport widths

The system SHALL render the shared frame, its navigation, and each existing screen at viewport widths from 320 CSS pixels through desktop sizes without page-level horizontal overflow, clipped content, or controls that require a wider viewport. The system SHALL allow normal browser zoom and SHALL NOT disable user scaling. Any intentional horizontal scrolling SHALL be confined to the content region that needs it. At wider viewports, the system SHALL use available space without stretching narrow forms or summary content beyond readable widths.

#### Scenario: The screens fit a narrow phone viewport

- **WHEN** each of the eight routes is rendered at a 320 CSS-pixel viewport width
- **THEN** the page itself has no horizontal overflow, the route content remains available, and the user can reach every control

#### Scenario: The frame and content adapt across device sizes

- **WHEN** a route is shown at phone, tablet, and desktop viewport widths
- **THEN** the shared frame and content reflow to the available width, while larger displays retain an appropriate multi-column layout where the content supports it

#### Scenario: Browser zoom remains available

- **WHEN** the user zooms the page on a phone
- **THEN** text and controls scale normally, and the application does not lock the viewport against user scaling

### Requirement: All application destinations remain reachable from mobile navigation

The shared navigation SHALL keep links to the five menu destinations available on narrow and wide viewports. On narrow viewports it SHALL use a compact disclosure control rather than allowing the link row to overflow. The control SHALL expose its expanded state to assistive technology, support keyboard activation, and keep the current destination distinguishable. Activating a destination SHALL navigate to the same route as the corresponding wide-screen link. The category, people, and import screens SHALL remain reachable on a narrow viewport through the transactions screen's category-management link and the manage hub's entries.

#### Scenario: The mobile navigation is initially collapsed

- **WHEN** a route is loaded at a narrow viewport
- **THEN** a labelled navigation control is available, reports that the navigation is collapsed, and the navigation links do not overflow the page

#### Scenario: The mobile navigation opens and closes accessibly

- **WHEN** the navigation control is activated by pointer or keyboard
- **THEN** it exposes all five menu destinations, reports the expanded state, and can be activated again to collapse the links

#### Scenario: A mobile route link reaches the selected screen

- **WHEN** a user activates any menu destination in the expanded mobile navigation
- **THEN** the corresponding screen opens, its link is marked as current, and the navigation returns to its collapsed state

#### Scenario: Wide-screen navigation remains directly available

- **WHEN** a route is rendered at a wide viewport
- **THEN** all five menu destinations are directly visible and the current destination remains distinguishable

#### Scenario: The remaining screens remain reachable on a phone

- **WHEN** the category, people, or import screen is needed at a 320 CSS-pixel viewport width
- **THEN** the transactions screen's category-management link or the manage hub's entry reaches it with no page-level horizontal overflow
