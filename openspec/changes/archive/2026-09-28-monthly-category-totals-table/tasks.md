# Tasks

## 1. Monthly matrix aggregation

- [x] 1.1 Add a category-by-month matrix helper using the existing monthly groups and exact absolute summation; extend unit tests for category identity/order, uncategorised values, zero cells, and exact precision, and verify with `npm run test:unit`.

## 2. Monthly totals screen

- [x] 2.1 Add the `/monthly-totals` page with a semantic, horizontally scrollable category-by-month table, loading/error/empty states, and exact locale-formatted totals; add component tests for the twelve month rows, headings, cell values, and states, and verify with `npm run test:components`.

## 3. Navigation and integration

- [x] 3.1 Add the “Monthly totals” link to the shared menu and extend layout tests to verify its route and active-state behavior; verify with `npm run test:components`.
- [x] 3.2 Run the unit and component suites together to confirm the new table, navigation, and existing analytics behavior pass: `npm run test:unit && npm run test:components`.

## 4. All-history months and blank zero cells

- [x] 4.1 Aggregate table data by every booking month represented in returned transactions instead of the rolling 12-month window; add unit tests for older months, newest-first ordering, and omitted months without transactions, and verify with `npm run test:unit`.
- [x] 4.2 Update the table to show only represented months and leave exact-zero cells blank while preserving their table positions; add component tests for both behaviors and verify with `npm run test:components`.
- [x] 4.3 Run `npm run test:unit && npm run test:components` and verify the revised table behavior passes while the existing analytics chart remains limited to twelve months.
