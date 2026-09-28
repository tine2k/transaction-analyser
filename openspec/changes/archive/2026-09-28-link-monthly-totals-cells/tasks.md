# Tasks

## 1. Link populated cells to their transactions

- [x] 1.1 In `app/pages/monthly-totals.vue`, add a category-query mapping (`category:<id>` → `<id>`, `uncategorised` → `uncategorised`) and render each cell that displays an amount as a `NuxtLink` to `{ path: '/', query: { month: month.key, category: <mapped value> } }`, leaving blank zero-total cells as plain cells; extend `tests/components/monthly-totals.test.ts` to assert the named-category and uncategorised link targets and that blank cells are not links, and verify with `npm run test:components`.
- [x] 1.2 Add the hover affordance (background tint plus a short color transition) to the linked cells only, and extend the component tests to assert the affordance classes are present on linked cells and absent on blank cells; verify with `npm run test:components`.

## 2. Integration verification

- [x] 2.1 Run `npm run test:unit && npm run test:components` and confirm the monthly totals links, the existing index filter initialization, and the analytics links all pass.
