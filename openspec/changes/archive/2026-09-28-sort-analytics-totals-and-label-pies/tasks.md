# Tasks

## 1. Exact totals and locale formatting

- [x] 1.1 Add exact numeric comparison and descending category-total ordering with category-name tie-breaking; extend `tests/unit/category-spending.test.ts` for decimal-scale differences, large values, and equal totals, and verify with `npm run test:unit`.
- [x] 1.2 Replace the euro string-prefix formatter with browser-locale EUR formatting that preserves exact decimal digits and thousands grouping; add unit coverage for locale separators and values beyond safe floating-point precision, and verify with `npm run test:unit`.

## 2. Analytics presentation

- [x] 2.1 Apply the shared sorted totals to each month's visible totals and pie data after filtering, enable a visible category-and-formatted-amount label on every pie slice, and reuse locale formatting in labels and tooltips; extend `tests/components/analytics.test.ts` for descending order, labels, localized amounts, and hide/show behavior, and verify with `npm run test:components`.
