# Design

## Context

See `proposal.md` for motivation and the delta specs for the observable contract. The browser derives every Monthly and Yearly figure from one `GET /api/transactions` response in `app/utils/category-spending.ts`; the Transactions screen builds its period choices from the same response in `app/pages/index.vue`. Today is supplied by `getLocalDateString(new Date())` in each page, and all month keys are `YYYY-MM` strings, so "future" can be decided by lexicographic comparison with `today.slice(0, 7)`.

## Goals / Non-Goals

**Goals:**

- Provide one shared definition of a future month and a future year so the three screens cannot drift.
- Keep every calculation exact and client-side; no API, database, or stored-data change.
- Keep past-year behavior unchanged: all twelve months remain available.
- Update component, unit, and browser tests so the new control and column counts are enforced.

**Non-Goals:**

- Changing the Monthly average window; it already ends at the current month, and future days inside the current month remain excluded as before.
- Hiding future-dated transactions from `All periods` or search results; only month/year columns and filter choices are hidden.
- Changing the server read endpoint or adding a server-side "as of" date.
- Changing category, person, expense-type, hidden-category, or uncategorised behavior.

## Decisions

### 1. Shared elapsed-period helpers in `app/utils/category-spending.ts`

Add helpers that take `today` explicitly, matching the existing style:

- `isFutureMonthKey(monthKey, today)` compares `YYYY-MM` keys.
- `isFutureYear(year, today)` compares calendar years.
- `getElapsedCalendarYearMonths(year, today)` returns `[]` for a future year, all twelve `getCalendarYearMonths(year)` entries for a past year, and the first `getElapsedMonthsInYear(year, today)` entries for the current year.

`getCalendarYearMonths` stays a pure twelve-month builder so existing callers and tests that need a full year keep working. The new helper is used by the Monthly month controls and the Yearly matrix.

Alternative considered: filter arrays inline in each page. Rejected because the comparison rule would be repeated three times and the boundary could drift.

### 2. Resolve unavailable future links through the existing defaults

`resolveSelectedMonth` accepts a supplied month only when it matches `YYYY-MM` and is not future; `resolveSelectedYear` does the same for a year. Otherwise they fall through to the current default logic, with the "newest represented" search filtered to non-future months or years. `getAvailableYears` and `getYearlyYearOptions` add a queried selected period only when it is not future, so a future link never creates a future control.

This reuses the existing absent/malformed fallback instead of adding a separate error state. The URL can keep the stale value; the page renders the fallback period, just as it already does for a malformed month.

### 3. Monthly year switching clamps the selected month

The year control changes only the year part of the selected month. When the target is the current year and the retained month number is after the current month, `onYearChange` selects the current month instead. Without this clamp, switching from December of a past year to the current year would produce an unoffered future month.

### 4. Yearly matrix separates shown cells from the whole-year total

`createYearlyCategoryMatrixData` gains a `today` argument. It:

1. Builds the shown month list with `getElapsedCalendarYearMonths`.
2. Accumulates every transaction belonging to the selected year, including transactions in months with no column.
3. Emits `cells` only for shown months.
4. Sets each row's `total` to the exact absolute sum across the entire year, and the matrix `total` from those row totals.
5. Computes the row maximum and tint scale from shown cells only.

This is the key consequence of the chosen behavior: a current-year category may have a total larger than the sum of its visible cells, and a category with only future-month transactions appears as a row with blank cells and a nonzero total. Tests must lock this down explicitly.

Alternative considered: exclude hidden months from totals as well. Rejected because the requested behavior keeps stored future amounts in year totals and `All periods` views.

### 5. Yearly template removes the not-yet-elapsed dash

Because every rendered month column is elapsed, `isElapsedMonth` and the `–` branch in `yearly.vue` are removed; a zero shown cell renders blank. The table's scroll region, responsive widths, links, and heatmap remain unchanged.

### 6. Transactions period choices filter at construction time

In `app/pages/index.vue`, the `periods` computed skips a month when `isFutureMonthKey(month, today)` and skips a future year entirely, including all of its months. The existing effective-period and default-period logic then treats a supplied future `month` or `year` as unoffered and falls back as it already does. Row matching for `All periods` and search is left untouched, so future-dated transactions remain visible there.

Alternative considered: filter future rows out of all views. Rejected because the chosen behavior keeps future-dated amounts in all-period views and year totals.

## Risks / Trade-offs

- **Yearly total exceeds visible cells** → The spec states that totals cover the whole year; add unit and component tests with a future-month-only transaction so the behavior is intentional and visible to future maintainers.
- **A category row can be blank but nonzero** → Test the future-only category case and keep the total cell's amount as the explanation; no new UI copy is introduced.
- **Stale future values remain in the URL** → The page renders the fallback period silently, matching existing malformed-period behavior; no redirect is added, so shared links stay harmless.
- **Month boundary while a page is open** → `today` is captured at page load, consistent with the existing screens; a reload moves the boundary.
- **Timezone drift** → All comparisons use the local `YYYY-MM-DD` value already produced by `getLocalDateString`, not UTC dates, so the boundary follows the user's browser calendar.

## Migration Plan

No stored data or schema changes. Deploy the frontend update normally; rollback restores the previous controls and columns without touching data. Browser bookmarks carrying future month or year values will show the fallback period after deployment and the previous period after rollback.

## Open Questions

None. The future-year, future-link, and future-total behavior is settled in the proposal and specs.
