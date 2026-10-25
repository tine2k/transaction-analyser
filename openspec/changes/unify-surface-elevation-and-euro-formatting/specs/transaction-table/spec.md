# Spec Delta

## REMOVED Requirements

### Requirement: Transactions sheets carry the mock's resting elevation

**Reason**: Replaced by `Transactions sheets rest elevated at every width`. The old requirement made the mobile sheets flat, which this change reverses.

**Migration**: Use `Transactions sheets rest elevated at every width`; both sheets carry the resting shadow at every viewport width, while the floating action bars keep their stronger upward shadow.

## ADDED Requirements

### Requirement: Transactions sheets rest elevated at every width

At every viewport width the Transactions filter and table sheets SHALL carry the shadow `0 1px 3px rgba(40, 30, 120, 0.08)`. The fixed action bars SHALL keep a stronger upward shadow because they float above the table.

#### Scenario: Sheets rest elevated at every width

- **WHEN** either Transactions sheet is rendered at a phone, tablet, or desktop width
- **THEN** its computed box shadow is `0 1px 3px rgba(40, 30, 120, 0.08)`

#### Scenario: Floating bars keep their stronger elevation

- **WHEN** a fixed action bar is shown on the Transactions screen
- **THEN** it keeps its stronger upward shadow and is not changed to the sheet shadow

## MODIFIED Requirements

### Requirement: The phone transaction list uses the mock's card presentation

At phone widths the system SHALL present each transaction as a surface card with the purpose and amount on its top row, the category pill below, and the booking and value dates in a meta row. The card SHALL use an 18px corner radius, the theme's resting shadow, 16px padding, and a 10px internal gap. The counterparty name, counterparty account, and person SHALL remain visible in the card.

#### Scenario: The card follows the mobile mock's arrangement

- **WHEN** a transaction card is rendered at a phone width
- **THEN** its purpose and amount share the top row, its category pill follows, and its booking and value dates share the meta row

#### Scenario: Every transaction value remains on the card

- **WHEN** a card is inspected
- **THEN** it shows the booking date, value date, amount, purpose, counterparty name, counterparty account, person, and category or its explicit absence

#### Scenario: The card uses the mock's surface metrics

- **WHEN** a card is rendered at a phone width
- **THEN** it has an 18px corner radius, the theme's resting shadow, 16px padding, and a 10px gap between its inner rows

#### Scenario: The amount stays ink-coloured

- **WHEN** a card shows a positive or negative amount
- **THEN** the amount is rendered in the theme's ink colour with its sign and no income or failure colour

#### Scenario: An absent account is an explicit gap

- **WHEN** a card's transaction has no counterparty account
- **THEN** the card shows an explicit absence rather than an empty or borrowed value
