# Spec Delta

## ADDED Requirements

### Requirement: The masthead stays pinned while the page scrolls

The system SHALL keep the shared masthead pinned against the top edge of the viewport while the page scrolls, at phone, tablet, and desktop widths. The pinned bar SHALL keep its normal place in the document flow, so page content is not offset twice or hidden beneath it. The bar SHALL keep painting its brand ground through the phone's top safe-area inset, and its controls SHALL clear that inset.

#### Scenario: The bar remains reachable on a long screen

- **WHEN** a route whose content is taller than the viewport is scrolled down at any supported width
- **THEN** the masthead stays against the top edge of the viewport, its identity and destinations remain visible and operable, and the page content scrolls beneath it

#### Scenario: The bar keeps its place in the flow

- **WHEN** a route is loaded and not scrolled
- **THEN** the masthead occupies its usual height above the page content, and the content is not pushed down twice or obscured by the bar

#### Scenario: An installed app's status-bar area stays painted

- **WHEN** the page is scrolled in an installed app whose top safe-area inset is greater than zero
- **THEN** the pinned bar's brand ground fills that inset and the masthead content remains below it

#### Scenario: A focused control is not hidden by the bar

- **WHEN** a keyboard user moves focus to an element near the top of the scrolled content
- **THEN** the focused element stays visible below the pinned masthead rather than behind it

### Requirement: The pinned masthead stays above the page content

The system SHALL stack the pinned masthead above the content that scrolls beneath it, including horizontally scrolling table regions, pinned table cells, and the transactions screen's fixed bottom bars. The masthead SHALL NOT be covered by that content, and the expanded narrow-viewport navigation panel SHALL remain operable, with every destination reachable, while the bar is pinned.

#### Scenario: Table content passes beneath the bar

- **WHEN** a screen containing a horizontally scrolling table region is scrolled vertically
- **THEN** the table and its edge affordances move beneath the masthead, and no part of the table paints over the bar

#### Scenario: The fixed bottom bars do not cover the masthead

- **WHEN** the transactions screen shows its fixed bottom action bars on a phone
- **THEN** the pinned masthead stays visible at the top with nothing from the bottom bars painted over it

#### Scenario: The expanded panel stays usable

- **WHEN** the narrow-viewport navigation is expanded and the page is moved, including on a viewport too short to show every link at once
- **THEN** the disclosure control and all five destination links remain reachable and operable within the pinned masthead, scrolling the panel rather than the page when its links exceed the available height

### Requirement: The narrow masthead centres the brand group

On narrow viewports, the system SHALL centre the logo mark and `Expenses` wordmark as one group against the full width of the masthead's inner content, while keeping the menu disclosure control at the leading edge as the first item. The group's horizontal midpoint SHALL coincide with the masthead's content centre line, and its position SHALL NOT shift when the navigation is collapsed or expanded. On wide viewports the brand group SHALL remain leading-aligned.

#### Scenario: The brand group is centred on a phone

- **WHEN** the menu bar is rendered at a phone width with the navigation collapsed
- **THEN** the logo mark and wordmark form one group whose horizontal midpoint meets the masthead content centre line, and the disclosure control remains at the leading edge before the group

#### Scenario: The burger does not push the identity off-centre

- **WHEN** the menu bar is rendered at a phone width and the disclosure control is present at the leading edge
- **THEN** the brand group is still centred against the full masthead width rather than centred in the space remaining beside the control

#### Scenario: Expanding the navigation keeps the identity centred

- **WHEN** the disclosure control is activated at a phone width
- **THEN** the brand group keeps its centred position and the expanded links appear beneath it

#### Scenario: The wide masthead stays leading-aligned

- **WHEN** the menu bar is rendered at a wide viewport width
- **THEN** no disclosure control is shown, and the logo mark and wordmark stay at the leading edge rather than being centred
