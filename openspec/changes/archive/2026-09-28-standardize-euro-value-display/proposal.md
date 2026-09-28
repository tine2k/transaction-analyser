# Proposal

## Why

Euro values are displayed inconsistently. Every derived or aggregate euro value in the application — analytics totals, pie labels and tooltips, monthly totals cells, and monthly averages — is rendered through a shared locale-aware EUR formatter, but the Transactions page's "Sum of displayed transactions" prints a bare signed decimal (`-18.74`) even though it is an aggregate of the same kind. Nothing states the rule, so each new display can drift on its own.

## What Changes

- Introduce a cross-cutting `euro-value-display` capability that states how euro values are shown across the application: a raw transaction amount is presented exactly as the read endpoint returned it, while a derived or aggregate euro value is presented using the browser's active locale's EUR conventions through one shared exact-decimal formatter.
- Change the Transactions page's "Sum of displayed transactions" so it is presented as a locale-formatted EUR value like the other aggregate displays, while its arithmetic stays exact and its sign is preserved.
- Leave the transaction amount column unchanged: it continues to show the signed decimal string exactly as returned.
- Update the `transaction-table` tests that pin the sum to a bare decimal.

## Capabilities

### New Capabilities
- `euro-value-display`: the presentation contract for euro amounts across the application — which values are shown verbatim and which are locale-formatted, exact-decimal preservation, the single shared formatter, and the fixed EUR currency.

### Modified Capabilities
- `transaction-table`: the existing "The table shows the exact sum of visible transaction amounts" requirement now requires the displayed sum to be a locale-formatted EUR value rather than a bare decimal string.

## Impact

- `app/pages/index.vue` — the visible-sum rendering.
- `app/utils/category-spending.ts` — the shared `formatEuroAmount` formatter used by all aggregate displays.
- `tests/components/transactions.test.ts` — assertions on the visible sum.
- `openspec/specs/euro-value-display/spec.md` (new) and `openspec/specs/transaction-table/spec.md` (modified).
