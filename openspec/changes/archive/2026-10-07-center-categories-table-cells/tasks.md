# Tasks

## 1. Center the Category Table Cells

- [x] 1.1 In `app/pages/categories.vue`, vertically center the category table's cell content by replacing the `align-top` class on the body cells (including the actions cell) with `align-middle`, and add `align-middle` to the header cells, leaving every column, value, row action, order, content sizing, alternating row colors, and the scroll region unchanged; verify in headless Chromium that the single-line values and the Edit and Delete buttons share the same vertical center in a row
- [x] 1.2 Extend `tests/components/categories.test.ts` to assert that every `th` and `td` in the category table carries the `align-middle` class and no cell carries `align-top`; verify with `npm run test:components`

## 2. Browser-Level Verification

- [x] 2.1 Extend the headless-Chromium test in `tests/browser/categories.spec.ts` (API intercepted as it does now) to measure the vertical center of a value cell's text against the vertical center of that row's Edit and Delete buttons and assert they align; verify with `npm run build && npm run test:browser`

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result updates `category-management-screen` in the main specs.
