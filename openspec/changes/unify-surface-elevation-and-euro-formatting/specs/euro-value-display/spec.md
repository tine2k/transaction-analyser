# Spec Delta

## MODIFIED Requirements

### Requirement: A derived euro value is presented using the browser's active locale

The system SHALL present every euro value that is derived from transaction amounts — including sums, totals, averages, chart slice labels, and tooltips — using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping, currency placement, and the locale's separator between the currency and the amount. Where the active locale places the currency symbol before the amount and its own format places no space between them, the system SHALL insert one non-breaking space between the symbol and the digits. It SHALL NOT add a second separator where the locale already provides one, SHALL NOT append a trailing separator where the symbol follows the amount, and SHALL NOT change the locale's placement of the minus sign. It SHALL derive the presentation from the exact decimal value, preserving the value's digits without rounding it through a floating-point conversion or silently dropping fractional digits. Where a specific requirement requires rounding, that requirement's rounding SHALL apply before presentation.

#### Scenario: A derived value follows locale grouping and placement

- **WHEN** a derived euro value such as `1234567.89` is shown under a locale that groups thousands
- **THEN** it is shown with that locale's grouping, decimal separator, and currency placement, and its currency is EUR

#### Scenario: The symbol is separated from the digits

- **WHEN** a derived euro value such as `1234.50` is shown under a locale that places `€` before the amount and whose own format places no space between them
- **THEN** it is shown as `€ 1,234.50` with one non-breaking space between the symbol and the digits

#### Scenario: An existing locale separator is not doubled

- **WHEN** the active locale already places a space between the symbol and the amount, such as `€ 1.234,50`
- **THEN** exactly that one locale separator remains and no second space is added

#### Scenario: A symbol after the amount gets no trailing space

- **WHEN** the active locale places the currency symbol after the amount, such as `1.234,50 €`
- **THEN** the value is unchanged and no trailing separator follows the symbol

#### Scenario: A large exact derived value is not rounded

- **WHEN** a derived euro value is larger than a floating-point number can represent exactly
- **THEN** it is shown with every digit intact, using locale conventions, without rounding through a numeric conversion

#### Scenario: A derived value keeps its sign

- **WHEN** a derived euro value is negative
- **THEN** it is shown as a negative locale-formatted euro value with the locale's minus placement, so the sign remains readable

#### Scenario: An explicitly rounded value uses its stated rounding

- **WHEN** a requirement specifies that a derived euro value is rounded to the euro cent
- **THEN** the value is rounded as that requirement states and the rounded value is presented using the browser's active locale's EUR conventions
