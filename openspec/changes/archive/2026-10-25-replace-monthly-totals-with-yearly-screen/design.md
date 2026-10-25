# Design

## Context

See `proposal.md` — Why. The current `/monthly-totals` page (`app/pages/monthly-totals.vue`) fetches every transaction once, applies the person and expense-type filters, groups transactions by booking month, and renders months as rows and categories as columns. The shared utility (`app/utils/category-spending.ts`) already provides exact decimal sums, absolute amounts, hidden-category exclusion, person and expense-type filters, category colours, locale EUR formatting, and twelve-month helpers. The Monthly screen (`app/pages/monthly.vue`) already establishes the surface-card, ink-amount, URL-backed filter, and full-width-frame conventions. The transaction screen already accepts `month`, `year`, `category`, and `person` query values.

The Yearly artboard is the same data as `/monthly-totals`, transposed and scoped to one year, with year pills, two summary cards, a total column, and a row-relative heatmap. The Income and Net cards and the Income vs spending chart are out of scope because the application sums absolute amounts and has no income classification.

## Goals / Non-Goals

**Goals:**

- Replace `/monthly-totals` with `/yearly` while keeping seven routes and preserving old links.
- Present one selected year as a category-by-month matrix with exact absolute sums, a total column, and row-relative tinting.
- Keep the existing single-read data flow, exact decimal arithmetic, filters, hidden-category rules, and locale EUR formatting.
- Keep the Yearly matrix usable on a phone through its own scroll region.
- Make the one necessary palette exception explicit: magnitude tint in this matrix only, with exact amounts still in ink.

**Non-Goals:**

- Building a sign-based income, spending, or net model.
- Changing the Monthly, Monthly average, or transactions screens.
- Adding a charting library or any new runtime dependency.
- Redesigning the menu order or the shared masthead.
- Changing the API, database schema, or read endpoint.

## Decisions

### D1: Repurpose the `monthly-category-totals-table` capability

Keep the existing capability path and replace its requirements rather than creating a near-duplicate capability. The old requirements describe a month-by-category matrix at `/monthly-totals`; the new requirements describe the Yearly matrix at `/yearly`. The capability keeps its id, and its title and purpose are updated to the Yearly table when the delta is synced, following the precedent set when `category-spending-chart` became the Monthly overview.

**Alternative considered:** create `yearly-category-table` and retire the old capability. Rejected: it needs a capability retirement plus a new-capability delta, and the project already accepted keeping a stable capability id while its screen changes.

### D2: Route and navigation

Add `app/pages/yearly.vue` at `/yearly`. Turn `app/pages/monthly-totals.vue` into a redirect page using `definePageMeta` with a function that returns `/yearly` and copies the current query, so `person` and any other existing values survive. Replace `Monthly totals` with `Yearly` in the layout's screen list, keeping the same slot and the seven-route bar. The document title becomes `Yearly · Expenses`.

**Alternative considered:** keep `/monthly-totals` and add `/yearly` beside it. Rejected: both screens would render the same data, and the route count would grow to eight for no user benefit.

### D3: Year selection

Render year pills rather than a select. Offer every year represented by an included transaction, the current year, and any well-formed `year` query value, ordered oldest to newest. Carry the selection as `year=YYYY`. Default to the current year when it is represented, otherwise the newest represented year, otherwise the current year. A queried year is added to the pills even when no transaction represents it, so a shared link resolves to an empty year rather than being silently replaced. Pills wrap when they do not fit.

**Alternative considered:** reuse the Monthly screen's year `<select>`. Rejected: the artboard uses pills, and a handful of years is easier to scan as pills. The pills wrap instead of scrolling the page.

### D4: Matrix derivation

Start from the returned transactions, apply the person filter, the expense-type filter, and the optional uncategorised exclusion, then exclude hidden categories. Group the remainder by booking month for the selected year. Build:

- rows for every category key represented in the year, including `uncategorised`;
- twelve month columns, using the existing `getCalendarYearMonths` helper;
- a month cell for each row and month, as an exact absolute sum or zero;
- a total per row, as the exact sum of its month amounts;
- rows ordered by total descending, then name ignoring case, then category identity.

Use the existing decimal-string helpers for all displayed sums; convert to a number only for the heatmap ratio. Categories keep colours from the application-wide colour map, built from every returned category so a category keeps its colour as the year and filters change.

**Alternative considered:** reuse `createMonthlyCategoryMatrixData` and transpose it. Rejected: it is keyed to the months-with-data shape and would obscure the year-scoped rules, especially the twelve fixed columns, the total column, and the empty-year case.

### D5: Summary cards and the elapsed-month average

`Total moved {year}` is the exact sum of the row totals. `Avg per month` divides that total by elapsed calendar months:

- current year: the current month number;
- past year: twelve;
- future year: no average, displayed as `–`.

Use the existing `averageDecimalString` helper for the euro-cent rounding, and state the divisor in the card's supporting text (for example, `over 10 months`) so the figure is not mistaken for a twelve-month average. Both cards follow the person, expense-type, and hide-uncategorised selections.

**Alternative considered:** divide by months with data. Rejected: a month with no transaction would silently raise the average, and the artboard's figure is explicitly a calendar-month average. **Alternative considered:** always divide by twelve. Rejected: it would understate the current year's average before December.

### D6: Row-relative heatmap

For each populated month cell, compute `ratio = cell amount / largest month amount in the row`, clamp it to the row's range, and set the background to `color-mix(in srgb, var(--color-brand) <6% + 50% * ratio>%, var(--color-surface))`. The row's largest month is the darkest cell; a row whose largest amount is zero gets no tint. A not-yet-elapsed month with no data and an elapsed zero use a neutral background. The `Total` column is never tinted. The amount text stays ink, so the exact value is always readable and colour is redundant.

This is the only place in the application where an amount's magnitude is encoded as colour. The `frontend-shell` delta records that exception explicitly. `color-mix` is already used by the transactions screen, so no new dependency or stylesheet is needed.

**Alternative considered:** use the category colour as the tint base. Rejected: the row-relative ratio already varies within a category, and mixing category identity and magnitude into one tint makes the meaning ambiguous. The artboard uses a single purple tint, which the brand token matches.

### D7: Table semantics and links

Use a semantic `<table>` inside a labelled scroll region with a caption, a row header for each category, and column headers for `Category`, `Jan`–`Dec`, and `Total`. The caption names the selected year. Month headings use three-letter abbreviations; the caption and the row headers carry the full context, and the cells carry the exact amount.

Each populated month cell is a `NuxtLink` to `/` with `month=YYYY-MM`, `category=<id>` or `uncategorised`, and `person=<id>` when a person is selected. Each populated total cell links with `year=YYYY`, the same category value, and the same person. A blank or `–` cell is not a link. The link contract is the one the transactions screen already implements, so no API change is needed.

**Alternative considered:** link only the total column and leave month cells inert. Rejected: month-level drill-down is the main reason to keep a month-by-category matrix, and the existing monthly totals table already links every populated cell.

### D8: Filters and URL state

Keep the person, expense-type, and hide-uncategorised controls from the Monthly totals screen. Person is URL-backed as `person=<id>` and falls back to all people for an absent or unknown value. Expense type and hide-uncategorised stay local state, matching the other analysis screens. Hidden categories are always excluded. Hide-uncategorised scopes the whole screen: rows, cells, totals, cards, and the average. Every control rebuilds from the one fetched response; none triggers a second request.

**Alternative considered:** put every filter in the URL. Rejected: the existing analysis screens keep expense type and hide local, and changing that convention is a separate product decision.

### D9: Visual treatment and responsive behaviour

Use the existing paper, surface, ink, muted, rule, and brand tokens. The summary cards are surface sheets with ink values, not the artboard's orange and pink cards. The matrix uses the brand tint for magnitude and the category dot for identity. The page keeps the full-width frame rather than the artboard's centred 1280px column.

On narrow widths the cards stack, the year pills wrap, and the matrix scrolls inside its own labelled region. A visible scroll hint appears where the table overflows. The table keeps every category, month, and total in the semantic markup; no column is hidden.

**Alternative considered:** hide the total column or collapse months on a phone. Rejected: the comparison is the screen's purpose, and the existing tables already establish horizontal scrolling within their own region.

### D10: Testing strategy

- Unit tests cover year options and resolution, elapsed-month counts, row totals, row ordering including `Uncategorised`, zero and future-month handling, the heatmap ratio, and the average rounding.
- Component tests replace `tests/components/monthly-totals.test.ts` with Yearly tests: one fetch, default year, URL year, pills, filters, hide scope, cards, total column, links, tint classes/styles, and loading/failure/empty states.
- Browser tests cover `/yearly`, the `/monthly-totals` redirect with its query, the document title, responsive layout at phone and desktop widths, and the expense-type flow.
- Layout tests assert the `Yearly` label and seven links.
- `openspec validate --strict` runs after the delta edits.

### D11: Capability and spec sync

The delta removes the five monthly totals requirements and adds the Yearly requirements. When the delta is synced, update the main capability's title and purpose from “Monthly Category Totals Table” to a Yearly description; the id stays `monthly-category-totals-table`. The `frontend-shell` and `responsive-frontend` deltas carry the route, title, menu, redirect, amount-colour and palette exceptions, and reflow changes.

## Risks / Trade-offs

- **The heatmap conflicts with the existing amount-colour rule** → The `frontend-shell` delta creates one explicit exception, the amount text stays ink, and the exact value is always present. A test asserts the amount remains readable and the tint is not the only carrier.
- **Row-relative tint is not comparable across rows** → The caption and the screen's supporting text describe the tint as relative to each row; the exact amounts are the authoritative comparison.
- **A future-dated transaction in the current year inflates the elapsed-month average** → The total includes all real transactions in the year; the card states the divisor. This is an edge case that does not justify hiding real data.
- **Replacing `/monthly-totals` breaks bookmarks** → The route redirects to `/yearly` and copies the query, so existing person links keep working.
- **The capability id stays “monthly”** → The title and purpose are updated at archive; the id is stable by design, as with `category-spending-chart`.
- **Year pills can grow with a long history** → They wrap within the page; no year is hidden. A select is a later option if the list becomes unwieldy.
- **Exact decimal arithmetic can be lost in the heatmap** → Only the tint ratio converts to a number; every displayed amount stays a decimal string through the existing formatter.

## Migration Plan

1. Add the year-matrix, elapsed-month, and row-intensity helpers to `app/utils/category-spending.ts`.
2. Add `app/pages/yearly.vue` with the pills, cards, filters, matrix, links, and states.
3. Replace `app/pages/monthly-totals.vue` with the `/yearly` redirect that preserves the query.
4. Update the layout's label, route, and title; update the README screen list.
5. Rewrite the component, unit, browser, and layout tests for Yearly; add the redirect check.
6. Run `openspec validate --strict`, the unit/component suites, the browser suite, and a production build.

Rollback is a normal code revert: the route, page, layout, helpers, and tests are all in this change, and there is no stored-data migration. The only persistent effect is a bookmarkable `/yearly` URL; `/monthly-totals` continues to work through the redirect until the revert removes it.
