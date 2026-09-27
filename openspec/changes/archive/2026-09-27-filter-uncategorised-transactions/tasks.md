# Tasks

## 1. Transactions filter and counts

- [x] 1.1 Update `app/pages/index.vue` with an all-transactions default and an uncategorised-only filter; show the complete-list and uncategorised counts from the fetched response. Verify in the browser with categorized and uncategorised transactions that selection changes the visible rows, keeps order and counts stable, and makes no additional request.
- [x] 1.2 Preserve clear loading, failure, and empty-result behavior with the filter controls. Verify that an empty response shows zero counts and the existing no-transactions message, zero uncategorised matches show a specific empty state, and request failure is not presented as zero.

## 2. Integration verification

- [x] 2.1 Run `npm run build` and verify it succeeds; manually check that both filter options and their counts remain available after switching between modes.
