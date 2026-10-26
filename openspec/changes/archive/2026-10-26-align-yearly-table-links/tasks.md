# Tasks

## 1. Center the Yearly Matrix Cells

- [x] 1.1 In `app/pages/yearly.vue`, add `align-middle` to every header and body cell of the Yearly matrix, change month links to `flex min-h-11 items-center justify-end px-2`, give blank month placeholders the same centered box, remove the Total cell's vertical padding, and make the Total link a `flex min-h-11 items-center justify-end px-2` box while keeping the cell's horizontal padding; verify in headless Chromium that a row's category label, populated month text, blank placeholder, and Total text share one vertical center
- [x] 1.2 Extend `tests/components/yearly.test.ts` to assert every matrix `th`/`td` carries `align-middle`, month links and placeholders carry the centering classes, and the Total link keeps its 44 px touch height; verify with `pnpm run test:components`

## 2. Browser-Level Verification

- [x] 2.1 Extend the API-intercepted test in `tests/browser/yearly.spec.ts` to measure the vertical center of a row's category label, a populated month link's text, a blank placeholder, and the Total link's text and assert each differs by at most one CSS pixel; also check the same centers at phone width and confirm every link remains at least 44 px high
- [x] 2.2 Run `pnpm run build && pnpm run test:browser -- tests/browser/yearly.spec.ts tests/browser/table-spacing.spec.ts` and verify the new alignment checks and the existing Yearly and table-spacing checks pass

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result updates `monthly-category-totals-table` in the main specs.
