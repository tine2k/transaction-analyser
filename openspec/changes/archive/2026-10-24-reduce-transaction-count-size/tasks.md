# Tasks

## 1. Reduce the count's type size

- [x] 1.1 In `app/pages/index.vue`, change the `visible-count` paragraph's classes from `font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl` to `font-display text-xl font-semibold tabular-nums text-ink`, leaving the surrounding summary markup and wording untouched; verify the class list contains no `text-2xl` or `text-3xl`.

## 2. Verify the compact emphasis

- [x] 2.1 Extend `tests/browser/transaction-summary-emphasis.spec.ts` to assert the count renders at 20px on a narrow and a wide viewport while the sum stays smaller, and verify the new assertions fail against the old `text-2xl sm:text-3xl` classes before applying task 1.1.
- [x] 2.2 Run `npm run test:browser` with the local Chromium available and verify the summary emphasis spec passes.

## 3. Confirm no collateral change

- [x] 3.1 Run `npm run test:unit` and `npm run test:components` and verify they pass without changes to the table, filters, search, sorting, or selection behavior.
- [x] 3.2 Run `openspec validate reduce-transaction-count-size --strict` and verify the change validates.

## Workflow follow-up

- Review the change, then archive it once implementation is complete.
