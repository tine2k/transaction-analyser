# Tasks

## 1. Content-Sized, Alternating Category Table

- [x] 1.1 In `app/pages/categories.vue`, drop `min-w-full` from the category table so it is only as wide as its content (`w-max` remains), and add the project's existing alternating-row classes (`odd:bg-white even:bg-slate-50`, as in `app/pages/imports.vue`) to the category rows; verify in headless Chromium that a short list renders a content-width table with visibly alternating rows
- [x] 1.2 Extend `tests/components/categories.test.ts` to assert the table keeps `w-max` and no longer carries `min-w-full`, and that rows carry the alternating background classes; verify with `npm run test:components`

## 2. Edit Scrolls the Form into View

- [x] 2.1 Add a template ref to the create/edit form and, in `startEdit`, after the form is populated, call `scrollIntoView` on it with smooth behavior, or with non-animated behavior when `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true; verify in headless Chromium that clicking Edit on a row below the fold brings the populated form into the viewport
- [x] 2.2 Extend `tests/components/categories.test.ts` to spy on `Element.prototype.scrollIntoView` and assert that starting an edit scrolls the form into view with smooth behavior, and with non-animated behavior when reduced motion is requested; verify with `npm run test:components`

## 3. Browser-Level Verification

- [x] 3.1 Add a headless-Chromium browser test for `/categories` (for example `tests/browser/categories.spec.ts`, intercepting the API as `tests/browser/responsive.spec.ts` does) covering the content-sized table, the alternating row backgrounds, and the edit scroll bringing the form into view; verify with `npm run build && npm run test:browser`
- [x] 3.2 Run the existing browser suite to confirm the category table still scrolls inside its region at 320 and 390 CSS-pixel widths with no page-level overflow after losing its full-width sizing; adjust the category fixture only if the content-sized table no longer overflows at a phone width, and verify with `npm run test:browser`

## Workflow follow-up

- Review the change and, once satisfied, archive it with the project's archive workflow.
- Verify the archived result updates `category-management-screen` in the main specs.
