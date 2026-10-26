# Tasks

## 1. Align the Yearly row with its month links

- [x] 1.1 In `app/pages/yearly.vue`, change the populated `Total` cell's `<td>` padding from `px-3 py-2 … sm:px-5` to horizontal padding only, and verify in the rendered table that the Total link keeps its `min-h-11` body and the row is no taller than the 44px month links.
- [x] 1.2 Run `pnpm run test:components` and verify the yearly component tests still pass, including the month link's `hover:bg-paper` and the blank-cell inertness checks.

## 2. Add browser regression coverage

- [x] 2.1 In `tests/browser/yearly.spec.ts`, add a test that locates a populated month cell, asserts the link's bounding box matches the cell's bounding box, and hovers near the cell's lower edge to confirm the link background changes.
- [x] 2.2 Run `pnpm run build` and then `pnpm run test:browser`, and verify the yearly browser tests pass with the new geometry and hover checks.

## 3. Integration verification

- [x] 3.1 Run `pnpm test` and verify the unit, component, and integration suites pass with no unrelated Yearly matrix regressions.
