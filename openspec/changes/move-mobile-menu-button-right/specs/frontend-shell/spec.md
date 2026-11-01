# Spec Delta

## REMOVED Requirements

### Requirement: The menu bar carries the application's identity and the current screen

**Reason**: The narrow-viewport disclosure control's placement changes from the leading edge to the trailing edge, so the narrow-viewport placement scenario can no longer hold. The requirement is reissued as two focused requirements: the identity and current-destination contract, and the disclosure control's narrow-viewport placement.

**Migration**: No consumer action is needed; the added requirements cover the same identity, destination, current-screen, and disclosure behaviours with the new trailing-edge placement.

## ADDED Requirements

### Requirement: The menu bar carries the application identity and current destination

The shared menu bar SHALL present the application's logo mark immediately left of `Expenses` and one visibly labelled link for each of the five destinations: Transactions, Monthly, Yearly, Monthly average, and Manage. The mark SHALL be decorative and SHALL NOT carry an accessible name. The current destination SHALL be distinguishable without relying on colour alone, with Manage standing in for the hub and its screens. The bar SHALL NOT add a destination beyond the five.

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

### Requirement: The narrow-viewport masthead places its disclosure control at the trailing edge

On narrow viewports the shared menu bar SHALL keep a labelled disclosure control for its five destination links. The control SHALL sit at the trailing edge of the masthead, after the logo mark and the `Expenses` wordmark, with the mark remaining immediately left of the name. From the wide breakpoint up the control SHALL be hidden, with the mark and name at the leading edge and the five links directly visible.

#### Scenario: Narrow viewports keep the disclosure

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the labelled disclosure control remains available, exposes the same five links, and keeps its expanded state available to assistive technology

#### Scenario: The disclosure control trails the narrow-viewport masthead

- **WHEN** the menu bar is rendered at a narrow viewport width
- **THEN** the disclosure control is the last item in the masthead and sits at its trailing edge, after the logo mark and the `Expenses` wordmark, and the mark remains immediately left of the name

#### Scenario: The wide-screen masthead keeps its order

- **WHEN** the menu bar is rendered at a wide viewport width
- **THEN** no disclosure control is shown, the mark and name stay at the leading edge, and the five bar links remain directly visible
