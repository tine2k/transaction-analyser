# Spec Delta

## Purpose

Defines how euro amounts are presented across the application, so that a raw transaction amount and a derived or aggregate euro value are each shown in the way their meaning requires and the same value looks the same everywhere.

## ADDED Requirements

### Requirement: A raw transaction amount is presented exactly as returned

The system SHALL present an individual transaction's own amount, wherever a transaction is listed, as the signed decimal string the read endpoint returned, preserving every digit and the sign. It SHALL NOT convert the amount to a floating-point number, round it, drop its sign, or apply currency or locale formatting to it, because the sign states the direction of the money movement and the exact digits are the stored value.

#### Scenario: A negative raw amount keeps its bare sign and digits

- **WHEN** a transaction's returned amount is `-42.75`
- **THEN** it is shown as `-42.75`, with the minus visible and no currency symbol, grouping, or localised separator added

#### Scenario: A positive raw amount reads as positive

- **WHEN** a transaction's returned amount is `250.00`
- **THEN** it is shown as `250.00`, distinguishable from the negative form, and not reformatted as a locale currency value

#### Scenario: A raw amount loses no precision

- **WHEN** a transaction's returned amount such as `0.01`, `-1234.56`, or a value with more fractional digits than a cent
- **THEN** it is shown exactly, with no rounding or floating-point approximation and no digit added or removed

### Requirement: A derived euro value is presented using the browser's active locale

The system SHALL present every euro value that is derived from transaction amounts — including sums, totals, averages, chart slice labels, and tooltips — using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping and currency placement. It SHALL derive the presentation from the exact decimal value, preserving the value's digits without rounding it through a floating-point conversion or silently dropping fractional digits. Where a specific requirement requires rounding, that requirement's rounding SHALL apply before presentation.

#### Scenario: A derived value follows locale grouping and placement

- **WHEN** a derived euro value such as `1234567.89` is shown under a locale that groups thousands
- **THEN** it is shown with that locale's grouping, decimal separator, and currency placement, and its currency is EUR

#### Scenario: A large exact derived value is not rounded

- **WHEN** a derived euro value is larger than a floating-point number can represent exactly
- **THEN** it is shown with every digit intact, using locale conventions, without rounding through a numeric conversion

#### Scenario: A derived value keeps its sign

- **WHEN** a derived euro value is negative
- **THEN** it is shown as a negative locale-formatted euro value, so the sign remains readable

#### Scenario: An explicitly rounded value uses its stated rounding

- **WHEN** a requirement specifies that a derived euro value is rounded to the euro cent
- **THEN** the value is rounded as that requirement states and the rounded value is presented using the browser's active locale's EUR conventions

### Requirement: The same euro value is presented the same way wherever it appears

The system SHALL present a euro value using a presentation that depends only on the value and the browser's active locale, not on the surface that displays it, so that the same value rendered on two surfaces looks identical in the same locale. The system SHALL NOT present the same kind of derived euro value as a bare decimal on one surface and as a locale-formatted euro value on another.

#### Scenario: One value, one presentation across surfaces

- **WHEN** the same derived euro value is shown on two different pages under the same active locale
- **THEN** both render it identically

#### Scenario: Derived values are not shown as bare decimals

- **WHEN** a derived euro value such as a sum or total is displayed
- **THEN** it is shown as a locale-formatted euro value rather than as an unformatted signed decimal string
