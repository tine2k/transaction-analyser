# Proposal

## Why

The transactions screen currently presents the sum of the displayed transactions as its dominant figure, with the matching transaction count tucked into parentheses at a much smaller size. The count is the more useful first fact for a reader scanning the list — it states how many rows the view contains before they interpret the money — so the visual hierarchy works against the reading order.

## What Changes

- Invert the summary's hierarchy on the transactions screen: the number of displayed transactions becomes the prominent figure, and the total sum becomes secondary supporting information.
- Keep both values tied to the same visible rows, with the existing labels, singular/plural wording, exact decimal arithmetic, and locale-formatted EUR presentation unchanged.
- Present the count first in the summary, using the page's display type and primary ink at a clearly larger size than the sum; present the sum beneath it in the existing smaller muted style.
- Keep the existing `visible-count` and `visible-total` presentation hooks and labels so the values stay unambiguous to readers and the existing behavioral assertions.
- No change to the data request, the table's columns, filtering, sorting, search, selection, or stored data.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `transaction-table`: the displayed transaction count becomes the summary's primary figure, and the sum of visible transaction amounts becomes secondary information beneath it.

## Impact

- `app/pages/index.vue`: the summary block at `data-testid="visible-total"` changes its typographic hierarchy and order; the count moves to the prominent figure and the sum to the secondary line. The underlying computed values and formatting stay the same.
- `tests/components/transactions.test.ts`: existing count and sum assertions continue to cover the unchanged values; add focused assertions for the new order and emphasis where practical without coupling to unrelated layout.
- `tests/browser/`: a headless Chromium check of the rendered emphasis may be added if the component test cannot observe it.
- `openspec/specs/transaction-table/spec.md`: updated on archive so the count and sum requirements state the new hierarchy.
- No server, API, database, dependency, or data-shape changes.
