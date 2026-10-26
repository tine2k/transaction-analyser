# Design

## Context

See `proposal.md` for motivation. The current `/monthly-average` page (`app/pages/monthly-average.vue`) makes one `GET /api/transactions` request and derives a sorted list from the response. The shared helper `getCategoryMonthlyAverages` returns only `{ key, name, amount }`: the exact per-month sums are discarded, so the design's trend and window total cannot be produced from its result.

The target is `design/Averages.dc.html`. Its content order is title and subtitle, one filter panel, three summary cards, then a five-column table. It is desktop-only and assumes a fixed 12-month window. The application has since adopted the design's type, surfaces, radii, masthead, and vivid category palette, but not its coloured summary cards: the palette and amount-colour rules in `frontend-shell` reserve content colour for categories, failures, destructive actions, and the Yearly magnitude tint. The recent Monthly and Yearly screens already resolved the same mockup tension with neutral surface cards.

Other constraints that shape the approach:

- Exact decimal-string arithmetic is the project convention; amounts are formatted through `formatEuroAmount` and never through floating point for display.
- `getLastCalendarMonths(today, count)` returns months newest first. The trend and subtitle need oldest first.
- Category colours come from `createCategoryColorMap` over every returned category, keyed by `category:<id>` or `uncategorised`.
- Category indicators must clear 3:1 against their ground. The mockup's bars use `opacity: .85`; over white that lightens the teal below its 3.07:1 floor, so the design must use solid fills. The mockup's lavender bar track is also below the floor; the established replacement is a white track with a rule outline.
- Wide tables use a labelled, keyboard-reachable horizontal scroll region with a visible hint below the large breakpoint.
- The in-flight `reorganise-navigation` change owns the menu labels; this change does not touch navigation.

## Goals / Non-Goals

**Goals:**

- Present every category in one comparison table with its trend, exact window total, average, and relative bar.
- Keep the existing window, person, expense-type, sorting, hidden-category, `Uncategorised`, and single-fetch behaviour.
- Add three exact summary figures with a clear, documented scope.
- Use the same visual grammar as Monthly and Yearly: a title block, one filter panel, neutral summary cards, a surface table, and its own scroll region.
- Keep every amount readable as exact text and every category indicator above the contrast floor.

**Non-Goals:**

- Renaming the screen or route to `Averages`.
- Fixed 12-month-only behaviour.
- The mockup's coloured card grounds, sticky table header, fixed-height table scroller, category drill-down links, or a hide-uncategorised control.
- Any API, database, dependency, or stored-data change.

## Decisions

### D1: Keep the window configurable and make every label dynamic

The window control stays, defaulting to 12 months. The mockup's "last 12 months" is treated as the default, not as the only window. The page derives the applied months from the existing last-valid-value rule, and uses that number in:

- the subtitle: `Average per category over the last N months · <first month> – <last month>`;
- the trend header: `Last N months`;
- the total header: `N-month total`;
- the trend itself: one bar per window month.

The window remains a numeric input in the filter panel rather than the mockup's absent control. A preset select (6/12/24) was considered and rejected because it would change the specified control from any positive whole number to a fixed set, a product change unrelated to the redesign. Fixing the window at 12 was rejected for the same reason; it would delete an existing requirement and its tests for a marginal visual simplification.

The subtitle states both the count and the month range, so the old separate "Averaging over the last N months" paragraph is no longer needed. A small range formatter (for example `Nov 2025 – Oct 2026`, or a single month when the window is 1) keeps that label testable.

### D2: Replace the average-only helper with a window data builder

Add a pure builder in `app/utils/category-spending.ts`:

```text
createCategoryMonthlyAverageData(transactions, today, monthCount)
  months: CalendarMonth[]            oldest -> newest, for the trend and range
  rows: {
    key, name,
    cells: string[]                  exact absolute total per month
    total: string                    exact sum of cells
    average: string                  averageDecimalString(total, monthCount)
    maximum: string                  largest cell, for the row-relative trend
  }[]
  total: string                      exact sum of every row total
```

The builder applies the existing hidden-category exclusion and window rules, includes `Uncategorised`, and orders rows with the existing stable category order. The page applies its person and expense-type selection before calling it, then sorts the returned rows by average amount or category.

`getCategoryMonthlyAverages` is removed and its unit tests migrate to the new builder. It has one production consumer and four unit tests; keeping a second average-only projection would leave an overlapping API with no consumer. An alternative was to keep it as a wrapper, rejected as dead surface area.

Monthly cells are summed from the same decimal-string helpers used by the Yearly matrix rather than from numbers. The page converts to numbers only for bar widths and trend heights, never for displayed values.

### D3: Derive the summary figures from exact window totals

The three cards follow the mockup's scopes:

| Card | Transactions | Respects person | Respects expense type |
| --- | --- | --- | --- |
| Average per month | The table's current selection | yes | yes |
| Recurring / month | Categories whose expense type is recurring | yes | no |
| One-time / month | Categories whose expense type is one-time | yes | no |

Cards 2 and 3 use a new `getWindowAbsoluteTotal(transactions, today, monthCount)` helper: it applies hidden-category exclusion and the window, sums absolute amounts exactly, and returns the string. Dividing that string by the month count uses `averageDecimalString`. Card 1 uses the builder's `total` (the same selected set as the table), so it never sums already-rounded category averages.

The typed cards intentionally exclude uncategorised transactions and categories with no expense type. They are context for the selected person, not a partition of the all-types figure; the spec states that explicitly. When the expense type is Recurring or One-time, card 1 duplicates the matching typed card. That is accepted as a focus indicator rather than solved with a fourth category, which would add a card the design does not have.

Alternative considered: make all three cards respect the expense type. Rejected because selecting Recurring would zero the One-time card and make the pair useless as context. Alternative: add an "Unassigned / month" card. Rejected as scope and visual noise; the gap is documented instead.

### D4: Neutral summary cards, not coloured grounds

The cards use the same treatment as Monthly and Yearly: `rounded-panel bg-surface p-5 shadow-sheet`, a muted small label, and an ink `text-3xl font-extrabold tabular-nums` value. They sit in a `grid-cols-1 sm:grid-cols-3` row. The mockup's brand, teal, and orange grounds are not adopted.

This is the same decision the Monthly and Yearly changes recorded: the palette requirement forbids decorative content accents, every amount must remain ink, and a per-screen accent would be the only one in the application. The large figure hierarchy is preserved by size and weight. The alternative — new "stat" colour tokens applied across the analysis screens — is a design-system change, not a Monthly average redesign, and would contradict the existing palette contract.

### D5: One filter panel, stacked labels, and a select for expense type

The five controls are presented in one surface panel using the Transactions screen's stacked-label pattern (`grid gap-1.5 text-xs font-bold text-muted`):

1. Person — `All people` or a returned person.
2. Type — `All types`, `Recurring`, `One-time` as a `<select>`.
3. Months — the existing positive-whole-number input, minimum 1.
4. Sort by — `Average amount` or `Category`.
5. Order — `Ascending` or `Descending`.

The grid is two columns at the narrowest width, three at `md`, and five at `xl`, so controls stay at least 44 CSS pixels high and never force page overflow. The expense-type radios become a select to match the mockup; the selection state, filtering helper, and non-URL persistence are unchanged. The `data-testid="expense-type-*"` hooks move onto the select/options, and browser tests use `selectOption` instead of `check`.

Alternative: keep radios and the current scattered controls. Rejected because it leaves the page as the only analysis screen without a consolidated panel and does not match the design's control row. Month, person, and sort semantics do not change.

### D6: Table structure and numeric treatment

The table is a semantic `<table>` inside a labelled scroll region:

```text
+----------------------------------------------------------------------------------+
| Category            Last N months     Average          N-month total   Avg / month |
| o Groceries         ||||||||||||      [==========]     EUR 1,234.00     EUR 102.83  |
| o Rent              ||||||||||||      [============]   EUR 10,800.00    EUR 900.00  |
+----------------------------------------------------------------------------------+
```

- Category is a row header (`<th scope="row">`) with a category-palette dot and the name. It is not a link in this change.
- The trend cell is decorative (`aria-hidden`); its bars are solid category colour.
- The average cell holds only the relative bar, also decorative because the exact amount is in the final column. Its track is `bg-surface` with `ring-1 ring-rule`, and its fill is solid category colour. It is scaled to the largest average in the current result; a zero average draws no fill.
- The total and average-per-month cells are exact formatted amounts, right-aligned and tabular. The average-per-month value is the primary figure (bold).
- The table has a caption for assistive technology and a visible `Scroll horizontally to view every column` hint below the `lg` breakpoint, with `aria-describedby` linking the region to the hint.

The mockup's `max-height: 760px` inner scroller and sticky header are not adopted: nested vertical scrolling competes with the page scroll and duplicates the table's own scroll region. The page scrolls naturally, as the Monthly and Yearly tables do. The comparison bar/total duplication is kept because the bar is the at-a-glance ranking and the columns are the exact record.

Alternative considered: render the table as category cards below `sm`. Rejected for this change because it adds a second presentation with the same data, while the existing responsive contract already allows wide analysis tables to scroll within their own region. The table's minimum width and scroll hint are the chosen mobile treatment.

### D7: Trend geometry and guard rails

The trend is a row of bars, oldest month first, inside a fixed-height box (30 px in the mockup):

- Bar height is `max(3px, round(percentOfRowMaximum / 100 * 28px))`, so a month with no spend keeps a visible minimum and the row's largest month sets the scale.
- Bar width is flexible within the trend column; gaps shrink from 2 px at short windows to 1 px at long ones. At a very long window the bars become a visual texture, which is acceptable because the exact total and average remain text.
- A zero row maximum produces the minimum bar for every month rather than a division by zero.
- Bars use solid category colour with no opacity. The mockup's `.85` opacity would push the teal below the 3:1 indicator floor on white.
- The trend is not a second source of numeric truth; no per-bar labels or tooltips are added.

Alternative: reuse the Yearly cell-tint approach. Rejected because it encodes a month magnitude as a background tint, while the design asks for a shape that can be scanned across categories; row-relative bars are the clearer form.

### D8: Sorting stays controlled by the two selects

The page keeps the existing sort-column and sort-direction selects and the existing stable comparators. It adds:

- a visible up/down mark on the sorted column header;
- `aria-sort="ascending"` or `"descending"` on that header, and nothing on the others.

Headers are not clickable. Making them a second sort control would add pointer-only behaviour, duplicate the selects, and expand the test surface without changing what the page can show. The spec's existing sort requirements are unchanged.

### D9: States, colours, and empty data

- The category colour map is built once from every returned transaction (including `uncategorised`) so a category keeps the same colour as on Transactions, Monthly, and Yearly.
- Loading and request failure keep the existing distinct messages.
- With no in-window category, the three cards show zero, the table is not rendered, and the existing `No category data for these months.` message is shown. This matches the Monthly and Yearly empty treatment.
- The invalid-window rule is unchanged: the last valid positive whole number remains applied.
- The person selection remains URL-backed as `person=<id>`; the expense type, window, and sort remain page state.
- No request is made after the initial `/api/transactions` read.

### D10: Testing strategy

- Unit: the builder's cells, chronological months, exact total, rounded average, row maximum, zero-month handling, hidden exclusion, uncategorised row, stable order, and window edge cases; the window-total helper; the month-range formatter.
- Component: one fetch; table columns and rows; bar count per window; summary figures and their scopes; subtitle and column labels for 12 and 6 months; select-based expense type; person URL fallback; sorting and `aria-sort`; empty, loading, and failure states; touch-sized controls; table surface elevation.
- Browser: the expense-type flow through the new select; phone and desktop reflow; the table's own horizontal scroll; summary figures; category bar contrast; document title and surface-elevation mappings updated to the table panel.
- Computed-style checks are used where colour is the assertion; no screenshot baselines.

## Risks / Trade-offs

- **A long window turns the trend into texture** → The exact total and average remain text, the labels state the window, and the bars keep a minimum width and gap. Users who need exact month values still have the Yearly screen.
- **Recurring + one-time does not equal the all-types figure** → The labels and spec describe the typed cards as typed-category context, not a partition; uncategorised and untyped amounts are visible only in the all-types figure.
- **Dynamic labels are less tidy than the mockup's fixed "12-month" wording** → Every label derives from the same applied count, so the page cannot claim a window it is not using.
- **Removing `getCategoryMonthlyAverages` touches existing tests** → The replacement preserves its arithmetic via the new builder's `average` field, and the unit cases move with it rather than being dropped.
- **Five columns are dense on a phone** → The table scrolls within its own labelled region, controls reflow, and the responsive spec requires every value to remain reachable.
- **The trend is hidden from assistive technology** → The exact average and window total are text in every row, and the trend never carries a value that is not available elsewhere.

## Migration Plan

No stored-data, API, or route migration is needed. The page and its helper are replaced together; reverting is a code revert with no data cleanup.
