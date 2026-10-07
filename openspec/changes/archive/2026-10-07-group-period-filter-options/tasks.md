# Tasks

## 1. Grouped period filter

- [x] 1.1 Change the `periods` computed in `app/pages/index.vue` to produce a years group (represented calendar years newest first, labelled with the bare year) and a months group (represented months newest first, labelled with month and year), leaving the all-periods choice outside both groups; verify the logic through the updated component assertions in `tests/components/transactions.test.ts`.
- [x] 1.2 Render the two groups as `<optgroup label="Years">` and `<optgroup label="Months">` in the period `<select>`, with `All periods` as the first option outside them, and update `tests/components/transactions.test.ts` to assert the group labels, the grouped option order, and the bare year labels; verify `npm run test:components` passes.

## 2. Verification

- [x] 2.1 Run `npm run test:unit` and `npm run test:components` and verify both pass, with the existing query round-trip, fallback, filtering, and row-order tests unchanged; confirm no browser or integration test references the flat period option list.

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
