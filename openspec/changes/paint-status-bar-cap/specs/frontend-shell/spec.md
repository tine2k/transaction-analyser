# Spec Delta

## ADDED Requirements

### Requirement: The status bar band is painted from a fixed cap

The system SHALL paint a fixed cap at the viewport's top edge so an installed app's platform can take the status bar's colour from it instead of blurring the page. The cap SHALL span the viewport, sit at the top edge, be as tall as the top safe-area inset, and carry the brand bar's start colour (`#101b5d`) as a solid background colour. The cap SHALL NOT take part in the page's layout or receive pointer events. With no top safe-area inset the cap SHALL have no height and draw nothing.

#### Scenario: The status bar takes the brand colour

- **WHEN** the app runs with a top safe-area inset
- **THEN** a fixed element at the viewport's top edge spans the viewport, is as tall as that inset, and its background colour is `#101b5d`

#### Scenario: No inset draws no band

- **WHEN** all safe-area insets are zero
- **THEN** the cap has no height, and the header and the frame keep their current spacing and content position

#### Scenario: The cap does not move the page

- **WHEN** a top safe-area inset is present
- **THEN** the header still begins at the viewport's top edge, its content still begins at or below the inset, and the cap neither scrolls with the page nor intercepts pointer input
