# Proposal

## Why

Every transaction amount on the Transactions screen is rendered in the same ink colour. The direction of the money movement is carried only by a leading minus sign, so scanning a dense table of signed decimals for spending versus income takes deliberate reading rather than a glance.

Colour can carry that direction alongside the sign, but it has to stay legible on the white surfaces and stay clearly distinct from the brand blue, the muted grey, and the failure red already used for error text. The current palette already defines ink-role green and red values built for readable text on light grounds; the theme does not yet expose them for amount direction.

## What Changes

- Add two semantic theme tokens to the design palette: `--color-amount-positive` (`#0B5132`, the palette's Green ink) and `--color-amount-negative` (`#8A1428`, the palette's Red ink). Both are dark enough for body-size text on white.
- Render a negative transaction amount in `amount-negative` and a positive one in `amount-positive`, in both the desktop table's amount column and the phone card's amount.
- Keep the amount text exactly as returned, including its sign, digits, and lack of locale formatting. The colour supplements the sign; the sign remains the primary, non-colour indication of direction.
- Render a zero amount in the existing ink colour: it is neither income nor spending, so neither amount colour applies.
- **BREAKING (spec-level)**: replace the phone-card requirement that the amount stays ink-coloured with one that requires direction colouring on the card, matching the table.
- Leave the summary line's visible-row sum in the muted colour, leave all other amounts on other screens unchanged, and change no sorting, filtering, selection, assignment, or stored data.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: the desktop amount column and the phone card amount carry the direction colour, with the sign retained; the rule requiring the card amount to stay ink-coloured is replaced.

## Impact

- `app/assets/css/main.css`: two new `@theme` colour tokens.
- `app/pages/index.vue`: the table amount cell and the phone card amount bind a direction-dependent colour class.
- Tests: the mobile-card browser assertion on `amountColor`, plus new component or browser assertions for positive, negative, and zero amounts in both presentations.
- No API, database, dependency, route, query, or stored-data change.
