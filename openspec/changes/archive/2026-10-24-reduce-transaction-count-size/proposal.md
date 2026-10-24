# Proposal

## Why

The transactions summary renders the visible transaction count at `text-2xl` on narrow screens and `text-3xl` from the `sm` breakpoint, which is page-title scale. The count is useful context, but at that size it dominates the transactions screen and visually competes with the page heading.

## What Changes

- Reduce the displayed transaction count in the transactions summary from `text-2xl sm:text-3xl` to a single `text-xl` size at every viewport.
- Keep the count as the summary's primary figure: it remains larger than the sum, uses the display face, primary ink, semibold weight, and tabular numerals, and still precedes the sum.
- Keep the summary container, test hooks, wording, singular/plural handling, and the sum's presentation and arithmetic unchanged.
- No change to the table, the amount column, filtering, sorting, search, selection, or data requests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: the displayed transaction count requirement now bounds the count's type at the `text-xl` step instead of allowing it to scale to page-title size, while it remains the summary's largest figure.

## Impact

- `app/pages/index.vue`: the `visible-count` paragraph's utility classes only.
- `tests/browser/transaction-summary-emphasis.spec.ts`: the emphasis check gains an assertion for the reduced count size.
- No API, data, dependency, or configuration changes.
