# Tasks

## 1. Transaction filters and visible-row total

- [x] 1.1 Add or reuse exact decimal arithmetic for signed transaction amounts and add unit tests covering fractional, large, positive/negative, and empty sums; verify the tests pass without floating-point rounding.
- [x] 1.2 Implement query-backed category and booking-month filters on the transaction list, retaining the uncategorised default when no category query is present; add component tests for defaults, each filter choice, combined filters, direct query links, row order, and unchanged request count.
- [x] 1.3 Display the exact sum of the currently visible rows separately from the transaction columns; add component tests proving the sum changes with filters and is zero for no matching rows.

## 2. Analytics navigation

- [x] 2.1 Link each monthly heading to the transaction list with that month and all categories selected; add a component test that verifies the generated destination for a month.
- [x] 2.2 Make each pie slice navigate to its month and category filter, including the uncategorised slice; add component tests for named and uncategorised destinations and verify chart data still comes from the existing transaction response.

## 3. Integration verification

- [x] 3.1 Run `npm run test:unit` and `npm run test:components` and verify the new exact-total, query-state, and chart-navigation tests pass with the existing suites.
- [x] 3.2 Run `npm run build` and verify the application builds with the route-query navigation and chart interaction changes.
