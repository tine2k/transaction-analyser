# Spec Delta

## ADDED Requirements

### Requirement: The transactions screen links to category management

The transactions screen SHALL carry an in-application link labelled `Manage categories` to the category management screen. The link SHALL sit with the Category filter and remain visible at phone and desktop widths. At phone widths its hit area SHALL be at least 44 CSS pixels high. The link SHALL NOT change the Category filter's choices, defaults, query values, or filtering, and the search, Person, Period, and Category controls SHALL keep the arrangement their requirements define.

#### Scenario: The link reaches the category screen

- **WHEN** the transactions screen is shown and the `Manage categories` link is followed
- **THEN** the category management screen is reached through in-application navigation on the same origin

#### Scenario: The link fits a phone width

- **WHEN** the transactions screen is shown at a 320 CSS-pixel viewport width
- **THEN** the link remains visible beside the Category filter with a hit area at least 44 CSS pixels high, and the page has no horizontal overflow

#### Scenario: The link leaves filtering unchanged

- **WHEN** the transactions screen is rendered with the link
- **THEN** the Category filter's choices, default, query values, and filtering behavior are those defined by the category-presence filter requirement
