# Design

## Context

See `proposal.md` for the motivation. The two surfaces that render a transaction amount are both inside `app/pages/index.vue`: the desktop table's amount cell (last column) and the phone card's `[data-transaction-field="amount"]` span. Both currently hardcode `text-ink` and render `transaction.amount` verbatim.

The theme lives in `app/assets/css/main.css` as Tailwind v4 `@theme` tokens. Tailwind generates utilities from those tokens, so `--color-ink`, `--color-failure`, and `--color-brand` back `text-ink` and friends. The application category palette in `app/utils/category-spending.ts` carries `main`, `tint`, and `ink` roles per family, but those roles belong to a category's identity, not to the direction of an amount.

Amounts are signed decimal strings returned by `GET /api/transactions`; `euro-value-display` forbids reformatting a raw transaction amount. `app/utils/category-spending.ts` already exposes `isZeroAmountString` for exact zero checks.

## Goals / Non-Goals

**Goals:**

- Colour transaction amounts by direction on both the table and the phone cards, using the existing palette.
- Keep the sign, digits, and exactness of the stored amount untouched.
- Keep the added colours legible on white and clearly distinct from each other.

**Non-Goals:**

- Colouring the summary line's derived sum, other screens' amounts, or category pills.
- Adding colour to sorting, filtering, selection, assignment, or any stored value.
- Reformatting amounts, adding currency symbols, or changing the column order.

## Decisions

### Add two semantic tokens instead of reusing palette values inline

Add to `@theme` in `app/assets/css/main.css`:

```css
--color-amount-positive: #0b5132;
--color-amount-negative: #8a1428;
```

These are the palette's Green and Red **ink** roles from `CATEGORY_COLOR_FAMILIES`. Both are designed as readable ink on a light tint, and on white they measure 9.39:1 and 9.50:1 respectively, well above the 4.5:1 body-text threshold. Their hue separation (green vs red) makes them distinguishable from each other while keeping the same darkness, so neither reads as "louder" than the other.

Naming them for the semantic role rather than for green/red keeps the templates independent of which palette values are chosen later. The utility names are `text-amount-positive` and `text-amount-negative`.

Alternatives considered:

- **Reuse `--color-failure` for negatives.** Rejected: failure red is already the error-state colour on several screens, so negative money would share a meaning with a failed operation. The palette's Red ink is close but distinct, and the token names keep the roles apart.
- **Use the palette's `main` colours (`#E03A4E`, `#1E9E4A`).** Rejected: their contrast on white is below 4.5:1 for this text size.
- **Pass a raw palette value through an inline style.** Rejected: it would bypass the theme and make the colour impossible to change in one place.

### Determine direction from the string, never from a number

A small helper in `index.vue` (or a shared util if a second surface appears) classifies the amount:

```ts
function amountTone(amount: string): 'negative' | 'positive' | 'zero' {
  if (isZeroAmountString(amount)) return 'zero';
  return amount.trim().startsWith('-') ? 'negative' : 'positive';
}
```

`isZeroAmountString` handles `0`, `0.00`, and `-0.00` without a numeric conversion. `Number(amount)` is not used, so a value with more fractional digits than a float can hold keeps its classification and, more importantly, its text.

The template maps the tone to `text-amount-negative`, `text-amount-positive`, or `text-ink` on the existing amount elements. No wrapper element, `aria-label`, or text change is introduced: the sign remains the accessible carrier, and forced-colours mode falls back to the sign.

### Zero stays ink

Zero is neither income nor spending. Colouring it green would falsely imply income, and red would falsely imply spending, so it keeps the primary ink colour already in use.

## Risks / Trade-offs

- **Colour-only meaning for sighted users who skip the sign** → The sign is still rendered, the text is unchanged, and the colours are additive. The spec's `The sign remains the primary indication` scenario and the contrast check guard this.
- **The negative red sits near the failure red** → The token names and contexts differ (money cell vs error text), the values are distinct (`#8A1428` vs `#A63A2E`), and failure text is never rendered in an amount cell. Worth a visual check when both appear on one screen.
- **Tailwind token names could collide with a future category family named `amount-positive`** → Unlikely; category families are matched by index and name in `CATEGORY_COLOR_FAMILIES`, not by CSS token name.
- **Existing browser assertion expects ink** → `tests/browser/mobile-transaction-cards.spec.ts` asserts `rgb(32, 30, 62)` for the card amount; it must switch to the direction colour for its fixture's negative amount.

## Migration Plan

No data, API, or route migration. The changed colours ship with the page; rollback is reverting the token declarations and the template bindings.
