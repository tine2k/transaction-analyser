# Tasks

## 1. Present the visible sum as a locale-formatted euro value

- [x] 1.1 In `app/pages/index.vue`, import `formatEuroAmount` from `../utils/category-spending` and render the computed visible sum through it instead of the raw string; verify by mounting the page with the existing fixtures and confirming the `visible-total` node shows `formatEuroAmount(...)` of the visible rows.
- [x] 1.2 Update `tests/components/transactions.test.ts` so each `visible-total` assertion compares against `formatEuroAmount(...)` of the expected total (including the zero case) instead of bare substrings such as `-0.25`; verify with `npm run test:components`.
- [x] 1.3 Add a component assertion in `tests/components/transactions.test.ts` that the raw amount column still shows the returned decimal string verbatim (e.g. `-12.50`) while the sum is locale-formatted; verify with `npm run test:components`.

## 2. Confirm the shared formatter contract holds across every euro display

- [x] 2.1 Audit `app/pages/analytics.vue`, `app/pages/monthly-totals.vue`, and `app/pages/monthly-average.vue` to confirm every derived euro value is rendered through `formatEuroAmount` and no surface prefixes a hard-coded `€` or renders a bare derived decimal; verify by searching `app/` for euro renderings and confirming each derived value passes through the formatter.
- [x] 2.2 Add unit coverage in `tests/unit/category-spending.test.ts` that a signed exact sum produced by `sumSignedAmountStrings` and rendered by `formatEuroAmount` keeps its sign and exact digits (including a value beyond floating-point precision); verify with `npm run test:unit`.

## 3. Integration verification

- [x] 3.1 Run `npm run test:unit` and `npm run test:components` after all edits and confirm every test passes with no regression.
- [x] 3.2 Run `openspec validate "standardize-euro-value-display" --strict` and confirm the change validates.
