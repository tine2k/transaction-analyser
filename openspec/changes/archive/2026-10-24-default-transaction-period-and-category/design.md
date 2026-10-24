# Design

## Context

The transaction table already derives its filter options from the loaded `GET /api/transactions` response and represents the selection in the index route query. Initial selections are fixed values in `app/pages/index.vue`: category `uncategorised` and period `all`. See `proposal.md — Why` for the motivation.

The table has no server knowledge of the current date, so the default period must be computed in the browser from the client clock and the returned booking dates.

## Goals / Non-Goals

**Goals:**

- Compute the initial period and category from the loaded response and the browser's current date.
- Keep explicit route query values authoritative over defaults.
- Reuse the existing filter, sorting, and query-sync machinery; no new request or stored state.

**Non-Goals:**

- Changing filter options, counts, sorting, the read endpoint, or the database.
- Persisting the default or remembering a user's last selection across loads.
- Changing behaviour when the route already names an offered category and period.

## Decisions

### Derive the period default from represented years

The default period is the current calendar year when it appears among the returned transactions' booking years. Otherwise it is the newest represented booking year. If no transaction is returned, it is `all`.

Rationale: the period control can only offer represented years, so selecting an unrepresented current year would leave the control in an invalid state. Newest-first ordering already puts the fallback year first among the year options.

Alternative considered: always selecting `all` when the current year is absent. Rejected because it would mix every represented year and contradict the request to show a year by default whenever one is available.

### Derive the category default from the effective period

The effective period is an offered query month or year when the route names one, otherwise the period default. The category default is `uncategorised` when at least one returned transaction in that period has a null category; otherwise it is `all`.

Rationale: the default view should land on uncategorised work when it exists, but must not open empty when the period's transactions are fully categorised. Scoping the check to the effective period keeps the two defaults coherent, including when an explicit period link is opened.

Alternative considered: checking the whole response for uncategorised transactions. Rejected because uncategorised rows in another year would select a filter that excludes the current year's data and produce an empty default view.

### Compute defaults only when the query supplies no usable value

Existing query parsing stays the entry point: a recognised category and an offered month/year still initialise the controls. When either is missing or unrecognised, the derived default fills it. The existing watcher on the route and on the derived option lists re-runs the derivation once the transaction response resolves.

Rationale: linkability and reload behaviour remain unchanged; the new defaults are the fallback path, not an override.

### Hold an explicit all-periods selection locally

Because an all-periods selection has no month or year in the query, the page records that the user chose it and does not reapply the period default when another filter or sort changes. A reload starts again from the default, as it does for every load.

Rationale: without this, the first later filter change would silently restore the current-year default and make the All periods choice appear not to stick within the session.


### Make the current date explicit in tests

Component tests will control the clock (or compute fixture years from the current date) so the current-year expectation does not silently expire in a later calendar year. Browser fixtures will do the same or freeze time.

## Risks / Trade-offs

- [A user opens a month link whose month has no uncategorised rows] → All categories is selected for that month, showing its transactions instead of an empty table.
- [The browser clock differs from the user's expectation] → The default follows the browser's local calendar date; no stored preference exists to conflict with it.
- [Existing tests assume `all` periods and unconditional uncategorised] → Update those expectations and add cases for each fallback branch in the same change.
