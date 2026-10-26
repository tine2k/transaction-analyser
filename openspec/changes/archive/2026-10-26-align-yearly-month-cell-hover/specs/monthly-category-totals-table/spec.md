# Spec Delta

## MODIFIED Requirements

### Requirement: Populated Yearly cells link to their transactions

Each populated month cell SHALL link to the transactions screen at `/` with `month=YYYY-MM`, the cell's category as `category` — the category identity or `uncategorised` — and the selected person as `person=<id>` when one is selected. Each populated `Total` cell SHALL link with `year=YYYY`, the category, and the selected person. A populated month cell's link SHALL fill the cell so the whole cell is its interactive and hover area. A blank cell SHALL NOT be a link. Links SHALL add no data request and change no stored data.

#### Scenario: A populated month cell links to its month and category

- **WHEN** a cell for category identity `1` and month `2026-09` displays an amount
- **THEN** it is a link to the transactions screen for month `2026-09` and category `1`

#### Scenario: A populated total cell links to its year and category

- **WHEN** a `Total` cell for category identity `1` and year `2026` displays an amount
- **THEN** it is a link to the transactions screen for year `2026` and category `1`

#### Scenario: Uncategorised links with the uncategorised value

- **WHEN** an `Uncategorised` cell displays an amount
- **THEN** its link carries `category=uncategorised`

#### Scenario: A selected person is carried

- **WHEN** a person is selected and a populated cell is opened
- **THEN** the link carries that person as `person=<id>`

#### Scenario: A blank cell is not a link

- **WHEN** a month or total cell displays no amount
- **THEN** the cell is not a link and offers no interactive affordance

#### Scenario: Linked cells have a hover affordance

- **WHEN** the pointer is over a linked cell
- **THEN** the cell presents a hover affordance that marks it as interactive

#### Scenario: A populated month cell's hover covers the whole cell

- **WHEN** the pointer is over any part of a populated month cell, including the area above or below its amount within the row
- **THEN** the entire cell presents the hover affordance and activates the month link

#### Scenario: Links add no data access

- **WHEN** the page renders its links or a link is activated
- **THEN** the page makes no additional data request and changes no stored data
