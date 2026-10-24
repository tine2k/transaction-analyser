# Design

## Context

The transactions summary on `app/pages/index.vue` renders the count with `font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl` and the sum beneath it in `text-sm text-muted`. The previous change established the count as the summary's primary figure at page-title scale. See `proposal.md` for why that scale is now too large and the delta spec for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Reduce only the count's type size to the `text-xl` step at every viewport.
- Keep the count clearly more prominent than the sum.
- Keep the summary structure, hooks, wording, and computations untouched.

**Non-Goals:**

- No change to the sum's type, colour, or placement.
- No new component, layout, colour token, or responsive breakpoint.
- No change to the table, amount column, filters, sorting, search, or selection.

## Decisions

### D1: Replace the responsive pair with one fixed `text-xl`

Change the count's class list from `text-2xl ... sm:text-3xl` to `text-xl`, keeping `font-display font-semibold tabular-nums text-ink`. A single size removes the viewport-dependent growth that made the figure reach heading scale on wide screens.

Alternatives considered: `text-2xl` without the `sm:text-3xl` bump (still larger than needed at 24px); `text-lg` (only 18px, eroding the separation from the 14px sum too far); keeping `sm:text-3xl` and reducing only the base size (does not address the wide-screen problem the request names).

### D2: Keep the count as the summary's primary figure

`text-xl` is 20px, still larger than the sum's 14px body type, so the established hierarchy survives: count first in ink and display type, sum beneath in muted body type. The sum therefore needs no change.

Alternative considered: shrinking the sum alongside the count. Rejected because the sum is already secondary and the request only concerns the count.

### D3: Verify the rendered size in the existing browser emphasis test

Extend `tests/browser/transaction-summary-emphasis.spec.ts`, which already compares computed font sizes, with an assertion that the count resolves to 20px at a narrow and a wide viewport. Computed-style checks catch a regression to `text-2xl`/`text-3xl` that a class-string assertion would miss and that happy-dom does not resolve in component tests.

Alternative considered: a component test asserting the class list. Rejected as brittle and blind to the actual cascade.

## Risks / Trade-offs

- **The count could stop reading as the summary's lead figure** → 20px still exceeds the sum's 14px and keeps the display face, semibold weight, and primary ink; the existing relative-size assertion guards this.
- **A future type-scale change could break the 20px expectation** → The test states the user-visible requirement (a compact `text-xl` size, no wide-screen growth); a deliberate scale change should update the check with the design decision.
- **Component test snapshots could encode the old classes** → No component test asserts these classes today; only the browser emphasis check covers the hierarchy.
