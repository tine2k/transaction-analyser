# Tasks

## 1. Slice label formatter

- [x] 1.1 Change `sliceLabel` in `app/pages/analytics.vue` to return only the category name, and verify the formatter no longer calls `formatEuroAmount`
- [x] 1.2 Confirm `tooltipLabel` still returns `name: amount` and is unchanged, and verify with `tests/components/analytics.test.ts` that the tooltip is covered

## 2. Tests

- [x] 2.1 Update or add a unit or component test in `tests/components/analytics.test.ts` asserting that a month and a year pie slice label contains the category name and no euro amount, and verify it passes with `npm test` (or the project's configured test command)
- [x] 2.2 Check `tests/browser/` for assertions on slice label text; update any that expect amounts on slices, and verify the browser suite passes with headless Chromium

## 3. Verification

- [x] 3.1 Run the analytics page in headless Chromium with sample data, confirm slice labels show names only in both months and years views, and confirm hovering a slice shows the amount in the tooltip
- [x] 3.2 Run `openspec validate remove-pie-slice-amount-labels --strict` and verify it passes
