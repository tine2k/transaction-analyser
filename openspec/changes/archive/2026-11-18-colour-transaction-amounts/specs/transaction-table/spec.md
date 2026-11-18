# Spec Delta

## ADDED Requirements

### Requirement: Transaction amounts carry their direction colour

Each transaction table row and phone card SHALL colour its amount by direction: negative in the theme's negative-amount colour, positive in the theme's positive-amount colour, and zero in the primary ink colour. The colour SHALL supplement the leading sign and digits and SHALL NOT change the amount's text.

#### Scenario: A negative amount reads as spending

- **WHEN** a transaction row or card shows a negative amount such as `-12.50`
- **THEN** its amount is rendered in the theme's negative-amount colour

#### Scenario: A positive amount reads as income

- **WHEN** a transaction row or card shows a positive amount such as `250.00`
- **THEN** its amount is rendered in the theme's positive-amount colour

#### Scenario: A zero amount takes neither direction colour

- **WHEN** a transaction row or card shows an amount of zero
- **THEN** its amount is rendered in the primary ink colour

#### Scenario: The sign remains the primary indication

- **WHEN** a coloured amount is read without colour, by assistive technology, or in forced-colours mode
- **THEN** its leading minus sign for a negative amount and its digits are unchanged, so the direction is still conveyed

#### Scenario: Colour does not alter the amount text

- **WHEN** a transaction amount is coloured
- **THEN** it shows exactly the signed decimal string the read endpoint returned, with no currency symbol, grouping, or rounding added

#### Scenario: Both presentations agree

- **WHEN** the same transaction is shown in the desktop table and in a phone card
- **THEN** both presentations colour its amount according to the same direction rule

#### Scenario: Amount colours stay legible and distinct

- **WHEN** a negative amount and a positive amount are rendered on the white surface
- **THEN** each colour reaches at least 4.5:1 contrast against that surface and the two colours are visibly different from each other

### Requirement: The phone transaction list presents direction-coloured amounts

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

#### Scenario: The card amount carries its direction colour

- **WHEN** a card shows a positive, negative, or zero amount
- **THEN** the amount is rendered in the negative-amount, positive-amount, or primary ink colour respectively, with its sign preserved

#### Scenario: An absent account is an explicit gap

- **WHEN** a card's transaction has no counterparty account
- **THEN** the card shows an explicit absence rather than an empty or borrowed value

## REMOVED Requirements

### Requirement: The phone transaction list uses the mock's card presentation

**Reason**: Replaced by `The phone transaction list presents direction-coloured amounts`, which keeps the card arrangement and metrics but colours the amount by direction instead of requiring it to stay ink-coloured.

**Migration**: Use `The phone transaction list presents direction-coloured amounts`. The card's arrangement, values, metrics, and explicit absent-account gap are unchanged.
