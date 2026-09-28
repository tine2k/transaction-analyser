# Design

## Context

The index page loads the full ordered transaction response once and applies a category-presence filter in the browser. The analytics page also loads that endpoint and computes twelve monthly category summaries from booking dates. Pie chart data already carries stable category keys, and exact decimal helpers exist for category totals. See `proposal.md` and the spec deltas for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Keep filters, navigation, and the visible-row sum derived from the existing transaction response.
- Make filter state navigable and reproducible through query parameters so chart links and direct visits have the same behavior.
- Reuse the project's exact decimal approach for the table sum.

**Non-Goals:**

- Add server-side filtering, another endpoint, database changes, or transaction mutations.
- Change the monthly chart aggregation rules or the chart's uncategorised visibility preference.

## Decisions

- **Represent filters in the index route query.** Use `month=YYYY-MM` for a calendar month and `category=all`, `category=uncategorised`, or the category identity for category selection. With no month query, show all months; with no category query, retain the current uncategorised-only default. Explicit `category=all` is needed for a month-heading link to include every category. This keeps chart navigation bookmarkable and makes the route the source of truth for its selected controls. A purely local selection was rejected because it would not support direct chart links or reloads.
- **Compose filters over the full client-loaded response.** Match month against the `YYYY-MM` prefix of `bookingDate`, category against its returned identity (or null for uncategorised), and preserve endpoint ordering. This avoids changing the read API's established contract or adding requests when a filter changes.
- **Use exact decimal addition for the displayed-row sum.** Sum only the currently visible amount strings using decimal-safe arithmetic, not JavaScript floating-point numbers. Keep this presentation summary separate from the transaction columns so each row continues to show the amount exactly as returned.
- **Navigate from chart events to the existing index route.** Add a link on each month heading and route slice activation to the corresponding query values. Keep both interactions sourced from each panel's existing month key and category datum; do not add chart-specific data fetching.

## Risks / Trade-offs

- [Invalid or stale query values may not correspond to current data] → Validate query values against the available month/category choices and fall back to the established defaults rather than inventing options or rows.
- [Pie chart interaction may be less discoverable or accessible than a standard anchor] → Make headings real links and ensure slice navigation is keyboard-accessible and exposed with an accessible category/month label.
- [Large decimal totals can lose precision if converted to `number`] → Keep arithmetic in exact decimal-string/integer-scaled form and cover fractional and large values in tests.

## Migration Plan

No data migration or API rollout is required. Deploy the client-side change with the existing application. Rollback is a code revert; old links to `/` continue to use the existing default uncategorised view.
