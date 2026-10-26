# Spec Delta

## MODIFIED Requirements

### Requirement: The category list is sized to its content and alternates row colors

The category table SHALL be only as wide as its columns and cell content require and SHALL NOT be stretched to fill the width of its container. Below the `sm` breakpoint, the pinned Name column MAY wrap a long name within a bounded width so the scrolling columns remain reachable; the full name SHALL remain present. Consecutive category rows SHALL alternate their background color so that adjacent rows are distinguishable. The table SHALL keep every column, row, cell value, row action, and its existing order, and SHALL remain inside its horizontally scrollable region when it is wider than that region.

#### Scenario: The table takes only the space it needs

- **WHEN** the category list is shown on a wide viewport and its content is narrower than the page
- **THEN** the table is no wider than its content requires and is not stretched across the page

#### Scenario: Adjacent rows are distinguishable

- **WHEN** several categories are listed
- **THEN** each row's background color differs from the background color of the row directly above or below it

#### Scenario: The table keeps its content and scrolling

- **WHEN** the table is wider than its scroll region
- **THEN** every column, cell value, and row action remains present and reachable by scrolling the region

#### Scenario: A long name wraps in the phone pinned column

- **WHEN** a category with a long name is shown at a 320 CSS-pixel viewport width
- **THEN** its full name is present in the pinned Name column, wrapping within that column, and the middle columns remain reachable by scrolling

## ADDED Requirements

### Requirement: The category table pins its name and actions on a phone

Below the `sm` breakpoint, the category table SHALL pin its Name column at the leading edge and its Actions column at the trailing edge of its scroll region, so both remain visible while the middle columns scroll. Each pinned cell SHALL use an opaque background. Pinning SHALL NOT change the columns, their order, the row order, the values, or the reachability of every column and action by scrolling.

#### Scenario: The name stays visible while the middle columns scroll

- **WHEN** a phone reader scrolls the category table horizontally to its end
- **THEN** the Name cell of every visible row remains at the leading edge and remains readable

#### Scenario: The actions stay visible while the middle columns scroll

- **WHEN** a phone reader scrolls the category table horizontally in either direction
- **THEN** each visible row's Actions cell remains at the trailing edge and its controls remain reachable

#### Scenario: Pinned cells do not show the scrolled columns through them

- **WHEN** the middle columns pass beneath a pinned cell
- **THEN** the pinned cell keeps an opaque background and its text remains legible

#### Scenario: Every column and action remains reachable

- **WHEN** the pinned category table is shown at 320 CSS pixels
- **THEN** every expression count, window count, analysis value, and expense type remains reachable by scrolling, and both row actions remain present

#### Scenario: The desktop table keeps its presentation

- **WHEN** the category table is shown from the `sm` breakpoint up
- **THEN** its columns, order, values, actions, and existing scroll behaviour are unchanged

### Requirement: Category row actions become icon-only on a phone

At phone widths each category row's Edit and Delete controls SHALL present icon-only buttons with accessible names that identify both the action and the category. Each control SHALL provide a hit area at least 44 CSS pixels in both dimensions and SHALL keep the create, edit, confirmation, and failure behaviour of the labelled controls. From `sm` up the controls SHALL keep visible text labels.

#### Scenario: Each icon-only action has a specific accessible name

- **WHEN** a phone reader inspects a row for the category `Groceries`
- **THEN** its two controls are named for editing and deleting `Groceries` rather than only for the generic action

#### Scenario: The icon-only actions are touch sized

- **WHEN** the category table is shown at a phone width
- **THEN** each row action has a hit area at least 44 CSS pixels wide and high

#### Scenario: Editing still targets the chosen category

- **WHEN** the phone reader activates the edit action on a category row
- **THEN** the edit form loads that category exactly as the labelled control does

#### Scenario: Deleting still asks for confirmation

- **WHEN** the phone reader activates the delete action on a category row
- **THEN** the category delete confirmation is shown before any request is sent

#### Scenario: Wider viewports keep visible labels

- **WHEN** the category table is shown from the `sm` breakpoint up
- **THEN** the Edit and Delete controls show their visible text labels
