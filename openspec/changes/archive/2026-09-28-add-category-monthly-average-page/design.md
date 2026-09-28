# Design

## Context

See `proposal.md` for motivation and `specs/` for the observable contract. The existing `/analytics` and `/monthly-totals` pages already fetch `/api/transactions` once and use `app/utils/category-spending.ts` to group transactions, sum exact absolute decimal strings, and format exact locale-aware EUR values. `getLastTwelveCalendarMonths(today)` implements the rolling-window month list, but only for twelve months. The shared menu is declared in `app/layouts/default.vue`; component coverage lives in `tests/components/` and unit coverage of the aggregation in `tests/unit/category-spending.test.ts`. The new page is a distinct summary view and does not replace the pie charts or the month matrix.

## Goals / Non-Goals

**Goals:**
- Reuse the existing single read request and exact absolute-decimal aggregation for a third read-only view.
- Make the averaging window adjustable on the page without another request, and generalise the existing rolling-window helper.
- Present every represented category with a stable, unambiguous ordering and a stated window.

**Non-Goals:**
- Change the existing chart, matrix, transaction API, database schema, or stored data.
- Add a charting/table dependency, a second data request, or server-side aggregation.
- Add filtering, drill-down, export, or persistence of the chosen window.

## Decisions

1. **Add a dedicated `/monthly-average` route and “Monthly average” menu entry.** Keep `/analytics` and `/monthly-totals` unchanged so each view stays independently reachable. Extend the shared menu and route contracts rather than replacing a screen. An extra panel on an existing page was considered, but the request asks for a new page and menu item, and a separate route keeps each view focused.

2. **Generalise the rolling-window helper instead of duplicating it.** Replace the hard-coded twelve with `getLastCalendarMonths(today, count)` and keep `getLastTwelveCalendarMonths` as a thin call to it for the existing chart. The average page groups only the returned transactions whose booking date falls inside that window, so “last N months” has the same meaning across screens. A second, parallel month helper was rejected as duplication.

3. **Compute the average in the exact decimal helpers, rounding once at the end.** Sum each category's in-window transactions with the existing `sumAbsoluteAmountStrings` (incoming and outgoing both positive), then divide by the configured month count with a bigint helper that rounds to two decimal places, halves away from zero, and returns a two-decimal string the existing `formatEuroAmount` renders in the active locale. This keeps cents exact until the single rounding step; converting to floating point was rejected because it can lose cents or large values. Empty in-window months contribute zero by dividing the window sum by the full month count, as the spec requires.

4. **Read categories from the in-window transactions, ordered exactly as elsewhere.** Each category key (`category:<id>` or `uncategorised`) present in a returned in-window transaction becomes one entry. Order named categories by name ascending case-insensitively, tie-break by identity ascending, and place `Uncategorised` last, matching `monthly-category-totals-table`. Calling `GET /api/categories` to include categories with no in-window activity was rejected: it would add a second request the spec forbids and show zeros the request did not ask for.

5. **Keep the window in a page-local control with a last-valid guard.** A number input holds the month count, initialised to 12. The displayed averages are a `computed` over the fetched transactions and the current valid count, so changing the control recomputes without a request. An empty or non-positive/non-integer entry leaves the previous valid count in effect, so the page never computes an undefined average. Persisting the choice was rejected as out of scope and as shell state the project avoids.

## Risks / Trade-offs

- [Dividing by the full window understates averages for categories with little recent activity] → This is the chosen “count empty months as zero” rule; the stated window makes it visible and the control lets the user narrow it.
- [A very large window or many categories makes the list long] → Keep the list compact and scrollable; no arbitrary cap is imposed.
- [Rounding could make a displayed average differ from an unrounded mental calculation] → Round exactly once to the cent, half away from zero, and document it in the spec scenarios.
- [Refactoring the twelve-month helper could change the chart] → Keep `getLastTwelveCalendarMonths` as a wrapper and rely on the existing unit and component tests to confirm the chart is unchanged.

## Migration Plan

No data migration or API deployment is required. Deploy the new route and menu entry with the existing app; rollback consists of removing the route, menu entry, and helper, with no stored data to restore.
