# Spec Delta

## ADDED Requirements

### Requirement: Transactions headings and summary use the mock's type scale

The Transactions title SHALL be 34px, 800 weight, and −0.02em tracking at desktop widths, and 28px and 800 weight at mobile widths. The summary line beneath it SHALL be 15px at desktop widths and 14px at mobile widths, with the count and sum sharing that size.

#### Scenario: Desktop title metrics

- **WHEN** the Transactions screen is rendered at a desktop width
- **THEN** the title computes to 34px, 800 weight, and −0.02em letter spacing

#### Scenario: Mobile title metrics

- **WHEN** the Transactions screen is rendered at a mobile width
- **THEN** the title computes to 28px and 800 weight

#### Scenario: Summary metrics follow the width

- **WHEN** the summary line is rendered
- **THEN** it computes to 15px at desktop widths and 14px at mobile widths, and the count and sum use the same size

### Requirement: Transactions filter labels and controls use the mock's type scale

Filter labels SHALL be 12px and 700 weight. Search fields and selects SHALL be 14px at desktop widths, and the mobile search field SHALL be 15px. Primary actions SHALL be 14px and 700 weight. The Clear and Dismiss actions SHALL keep readable interface type consistent with the surrounding controls.

#### Scenario: Filter labels are bold captions

- **WHEN** a filter label is rendered
- **THEN** it computes to 12px and 700 weight

#### Scenario: Fields use the design's size

- **WHEN** the search field or a filter select is rendered at a desktop width
- **THEN** its text computes to 14px, and the mobile search field text computes to 15px

#### Scenario: Primary actions are bold

- **WHEN** the Search action or another primary action is rendered
- **THEN** its text computes to 14px and 700 weight

### Requirement: Transactions page sections use the mock's gap

The Transactions page SHALL separate its title block, filter sheet, filter note, and table region with a 24px gap at desktop widths and a 14px gap at mobile widths.

#### Scenario: Desktop section gap

- **WHEN** the Transactions screen is rendered at a desktop width
- **THEN** adjacent page sections are separated by 24px

#### Scenario: Mobile section gap

- **WHEN** the Transactions screen is rendered at a mobile width
- **THEN** adjacent page sections are separated by 14px

### Requirement: Transactions sheets use the mock's rounded dimensions

The Transactions filter and table sheets SHALL use a 20px corner radius at desktop widths and 18px at mobile widths. The filter sheet SHALL use 20px vertical and 24px horizontal padding at desktop and 14px padding at mobile. The table sheet SHALL use 8px top, 24px horizontal, and 16px bottom padding at desktop. The sheets SHALL retain the surface-over-paper separation.

#### Scenario: Desktop filter sheet dimensions

- **WHEN** the filter sheet is rendered at a desktop width
- **THEN** it computes to a 20px corner radius with 20px vertical and 24px horizontal padding

#### Scenario: Desktop table sheet dimensions

- **WHEN** the table sheet is rendered at a desktop width
- **THEN** it computes to a 20px corner radius with 8px top, 24px horizontal, and 16px bottom padding

#### Scenario: Mobile sheet dimensions

- **WHEN** either sheet is rendered at a mobile width
- **THEN** it computes to an 18px corner radius, and the filter sheet uses 14px padding

### Requirement: Transactions sheets carry the mock's resting elevation

At desktop widths the Transactions filter and table sheets SHALL carry the shadow `0 1px 3px rgba(40, 30, 120, 0.08)`. At mobile widths the sheets SHALL be flat. The fixed action bars SHALL keep a stronger upward shadow because they float above the table.

#### Scenario: Desktop sheets rest elevated

- **WHEN** either Transactions sheet is rendered at a desktop width
- **THEN** its computed box shadow is `0 1px 3px rgba(40, 30, 120, 0.08)`

#### Scenario: Mobile sheets stay flat

- **WHEN** either Transactions sheet is rendered at a mobile width
- **THEN** it has no resting box shadow

#### Scenario: Floating bars keep their stronger elevation

- **WHEN** a fixed action bar is shown on the Transactions screen
- **THEN** it keeps its stronger upward shadow and is not changed to the sheet shadow

### Requirement: Transaction controls use the mock's height, padding, and corner radius

Search fields, filter selects, and page action buttons on the Transactions screen SHALL be 44px high at desktop widths and 48px at mobile widths, with a 12px corner radius. Search fields SHALL use 16px horizontal padding at desktop and 14px at mobile; filter selects SHALL use 14px and 12px; primary buttons SHALL use 22px and 18px. These controls SHALL retain a hit area at least 44px high. The category pill is governed by its own requirement.

#### Scenario: Desktop control metrics

- **WHEN** a Transactions search field, filter select, or page action button is rendered at a desktop width
- **THEN** it computes to 44px high and a 12px corner radius, with the design's horizontal padding for its kind

#### Scenario: Mobile control metrics

- **WHEN** a Transactions search field, filter select, or page action button is rendered at a mobile width
- **THEN** it computes to 48px high and a 12px corner radius, with the design's horizontal padding for its kind

#### Scenario: Hit areas remain large enough

- **WHEN** any of these Transactions controls is operated by touch
- **THEN** its hit area is at least 44 CSS pixels high

### Requirement: The transaction table uses the mock's type scale

The table SHALL set ordinary body text at 14px. Header cells SHALL set 12px, 700 weight, uppercase text with 0.06em tracking. Booking dates SHALL use 600 weight and amounts 700 weight.

#### Scenario: Header typography

- **WHEN** the table header is rendered
- **THEN** its labels compute to 12px, 700 weight, uppercase, with 0.06em tracking

#### Scenario: Body type

- **WHEN** an ordinary body cell is rendered
- **THEN** its text computes to 14px

#### Scenario: Row figures carry the design's weights

- **WHEN** a booking date and an amount are rendered
- **THEN** the booking date computes to 600 weight and the amount to 700 weight

### Requirement: The transaction table uses the mock's cell metrics

Header cells SHALL use 8px horizontal padding. Ordinary body cells SHALL use 13px vertical and 8px horizontal padding; cells whose own control supplies a 44px hit area SHALL use 8px horizontal padding and no vertical padding. The header row SHALL remain about 48px high while each sortable header keeps a 44px hit area.

#### Scenario: Ordinary cell metrics

- **WHEN** an ordinary body cell is rendered
- **THEN** it uses 13px vertical and 8px horizontal padding

#### Scenario: Control cells stay compact

- **WHEN** a body cell holds the selection or category control
- **THEN** it uses 8px horizontal padding and no vertical padding, and its control supplies a 44px hit area

#### Scenario: Header height and hit area are reconciled

- **WHEN** the sortable header row is rendered
- **THEN** the row is about 48px high and each header activation control has a hit area at least 44px high

### Requirement: The category pill uses the mock's type and padding

The category pill SHALL set its label at 12px and 700 weight with 5px vertical and 12px horizontal padding, on the pill radius. The visible pill SHALL keep that compact size while the row keeps a hit area at least 44px high for the assignment control.

#### Scenario: Pill metrics

- **WHEN** a categorised or uncategorised category pill is rendered
- **THEN** its label computes to 12px and 700 weight with 5px vertical and 12px horizontal padding

#### Scenario: Assignment control keeps its hit area

- **WHEN** the category assignment control is operated by touch
- **THEN** its hit area is at least 44 CSS pixels high even though the visible pill is compact

### Requirement: The empty state is centred and sized to the mock

When the Transactions table has no rows to show, the empty-state message SHALL be centred within the table sheet at 14px with 40px vertical padding. The failure and loading states SHALL keep their current meaning and SHALL use the interface type scale.

#### Scenario: Empty state metrics

- **WHEN** the active view matches no transaction
- **THEN** the empty-state message is centred, computes to 14px, and has 40px vertical padding

#### Scenario: Non-empty states keep their meaning

- **WHEN** the request is loading or has failed
- **THEN** the loading or failure state remains distinct from the empty state and uses the interface type scale
