# Spec Delta

## MODIFIED Requirements

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
