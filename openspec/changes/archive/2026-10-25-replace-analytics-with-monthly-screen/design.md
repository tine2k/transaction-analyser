# Design

## Context

See `proposal.md` for motivation. The current Analytics page (`app/pages/analytics.vue`) fetches every transaction once and builds twelve rolling-month pie panels plus a years view. The shared aggregation utility (`app/utils/category-spending.ts`) already provides exact decimal sums, locale currency formatting, person and expense-type filters, hidden-category exclusion, and category colour assignment. The monthly totals and monthly average screens use the same utility and must keep working unchanged.

The design folder also contains a `Yearly – Desktop` artboard. It is not part of this change, so the removed years view has no immediate replacement. The route and navigation must still present seven destinations, with `Monthly` taking the Analytics slot.

## Goals / Non-Goals

**Goals:**

- Present one selected calendar month with a stable URL, two summary figures, a top-eight bar, and a complete category table.
- Preserve the existing single-read data flow, exact decimal arithmetic, filters, hidden-category rules, and locale EUR formatting.
- Keep the application's palette, amount-colour, and full-width frame rules intact.
- Remove the now-unused pie-chart component and charting dependencies.
- Leave `/analytics` bookmarks working through a redirect.

**Non-Goals:**

- Building the Yearly screen or restoring a yearly aggregation in another form.
- Adding sign-based spending, income, net, refund netting, or a category income/expense classification.
- Redesigning the navigation order, the shared masthead, or the other analysis screens.
- Adopting the mock's coloured summary cards or its centred 1280px frame.
- Changing the API, database schema, or transaction read endpoint.

## Decisions

### D1: Repurpose the `category-spending-chart` capability

Keep the existing capability path and replace its requirements rather than creating a near-duplicate capability. The old requirements describe twelve pie panels and a years view, so they are removed; the new requirements describe the Monthly screen. The main spec's title and purpose are updated to match, because the capability no longer owns a chart.

**Alternative considered:** create `monthly-category-overview` and remove the old capability. Rejected: OpenSpec refuses a spec with no requirements, so the old capability would either be left contradicting the app or emptied into an invalid spec. A new capability would also duplicate the same boundary.

### D2: Route and navigation

`app/pages/analytics.vue` becomes `app/pages/monthly.vue`. A small `/analytics` page redirects to `/monthly`. The navigation keeps seven links and replaces `Analytics` with `Monthly` in the same slot, so the bar order stays `Transactions, Categories, People, Monthly, Monthly totals, Monthly average, Imports`.

**Alternative considered:** keep the `/analytics` URL and only change the heading. Rejected: the URL would keep naming a retired screen, and the design's primary analysis destination is Monthly. The redirect preserves existing links without keeping the stale name.

### D3: Month selection

The page offers a year `<select>` and twelve month buttons. Year options are every year represented by a returned transaction plus the current year, newest first. The pills always show twelve months for the selected year, including empty ones. The selected month is `month=YYYY-MM`; a well-formed query value wins and its year is added to the year options, so a link to a month outside the represented years still resolves to an empty month rather than being silently replaced.

Default resolution order: the current month when a returned transaction falls in it; otherwise the newest represented month; otherwise the current month. The default is computed from the returned transactions after hidden-category exclusion, not from the active person or expense-type filter, so changing a filter does not jump the user to another month.

Month buttons use the brand token for the selected state and carry `aria-pressed`; the twelve controls sit in a labelled group and scroll horizontally when they do not fit. The year change preserves the month number when that month exists in the new year (for example March 2026 to March 2025), which keeps the comparison intuitive.

**Alternative considered:** reuse the Analytics rolling twelve-month window. Rejected: labels repeat across years, the design shows a fixed year, and the URL would be ambiguous without a year.

### D4: Absolute arithmetic and two summary figures

Keep the existing absolute-sum convention. `Total moved` is the exact sum of absolute amounts for the selected month; `Transactions` is the count of included transactions. The design's Income and Net cards are not implemented: with absolute sums, positive income would be counted inside `Total moved`, so an Income card would double-count and a Net figure would be meaningless.

Labels are deliberately `Total moved` and `Category totals`, not `Spending` and `Where the money went`. An income category can therefore appear in the ranking, which is honest for absolute totals and matches how the current Analytics page already treats amounts.

**Alternatives considered:** gross sign split (negative = spending, positive = income) and net-per-category. Both produce a more intuitive Spending figure but change the arithmetic for this screen only and make it disagree with Monthly totals and Monthly average. They are deferred to a separate product decision.

### D5: Filters and exclusion rules

Keep the person and expense-type controls and the hide-uncategorised control. Remove the months/years view switch. Hidden-category transactions are excluded before any figure is derived, as on the other analysis screens. Uncategorised transactions are included by default and the hide control scopes the whole screen: summary figures, bar, table, and category count all exclude them together, so every displayed value agrees.

The person selection is URL-backed as `person=<id>` and retains the existing fallback to all people for an absent or unknown value. The expense-type and hide controls keep their current non-URL state, matching the other analysis screens.

**Alternative considered:** let the hide control affect only the table and bar. Rejected: the summary figures would then disagree with the breakdown, which is the problem the control already avoids on Analytics.

### D6: Breakdown arithmetic

For the selected month, after the filters, hidden-category exclusion, and optional uncategorised exclusion:

- Each category amount is the exact sum of the absolute amounts of its included transactions.
- `Uncategorised` is a distinct category, ordered with the others by amount.
- Entries are ordered by amount descending, then category name ascending. Zero-amount categories remain listed with amount `0` and no share fill.
- The bar takes the first eight entries and aggregates the rest into `Other N`. With eight or fewer entries there is no `Other` segment; with no nonzero amount there are no segments.
- The table lists every entry. Its share is the category amount divided by the largest category amount, with the largest at 100%; when the largest amount is zero no share fill is shown.
- The table's transaction count is the number of included transactions in that category, not the number of distinct transactions across the month.
- `Total moved` equals the sum of the table amounts; `Transactions` equals the sum of the table row counts.

All sums use the existing decimal-string helpers rather than JavaScript numbers. The page may convert exact strings to numbers only for proportional widths and share percentages, never for displayed amounts.

**Alternative considered:** share of total rather than share of the largest category. Rejected: the design's column is explicitly "Share of top category", and share-of-largest keeps the top row at a full bar.

### D7: Row navigation

Each table row is a `NuxtLink` to `/` with `month=YYYY-MM`, `category=<identity>` or `category=uncategorised`, and `person=<id>` only when a person is selected. This reuses the transaction screen's existing query contract, already used by the monthly totals table, so no new endpoint or API shape is needed. The stacked bar and legend stay non-interactive; the table is the complete, accessible drill-down surface.

**Alternative considered:** make bar segments clickable. Rejected: segments have no visible labels of their own, and an interactive bar would duplicate the table's navigation with a harder keyboard and screen-reader path.

### D8: Visual treatment

The page uses the existing paper, surface, ink, muted, rule, and brand tokens. The mock's orange, purple, teal, and blue summary cards are not adopted: the palette capability forbids decorative content accents, and every amount must remain ink-coloured. The two summary figures sit on surface sheets with ink values, keeping the design's large-figure hierarchy without changing the palette contract.

The page keeps the full-width frame required by `frontend-shell`, not the artboard's centred 1280px column. The month pills use the brand role for selection. Category colours continue to come from the single application palette, so a category keeps the same colour on the transactions screen, this screen, and any future analysis screen. The `Other` segment uses a neutral rule/muted tone.

**Alternative considered:** adopt the mock's summary-card colours as new accent roles. Rejected for this change: it would amend the palette and amount-colour rules for a purely decorative effect, and the screen already reads well with the large-figure hierarchy.

### D9: Remove the pie chart and charting dependencies

After the rewrite, `CategoryPieChart` has no consumer. Remove the component, its test, the `vue-echarts/style.css` import, and the `echarts` and `vue-echarts` dependencies. The design uses CSS for the stacked bar, and the Yearly artboard is a table, so no charting library is needed. This also removes the only reason for the charting-library allowance in `frontend-shell`; the allowance may remain because it permits rather than requires a library, but no dependency should stay without a consumer.

**Alternative considered:** keep the component and dependencies for the future Yearly screen. Rejected: dead code and an unused runtime dependency are harder to maintain, and the Yearly screen can add a library back if its design needs one.

### D10: Utility shape and reuse

Keep the shared helpers used by the transactions screen, Monthly totals, and Monthly average. Add pure helpers for:

- selecting a year's twelve calendar months and resolving a `month=YYYY-MM` query;
- filtering transactions to one calendar month;
- absolute category totals with transaction counts;
- splitting entries into top eight and `Other N`;
- computing share-of-largest percentages.

Remove analytics-only helpers that no longer have a consumer, such as the rolling chart datasets, pie data, and yearly grouping, after confirming no other screen imports them. Keep the decimal parsing, absolute/signed sums, locale formatting, person and expense-type filters, hidden-category exclusion, and category colour map.

### D11: States and accessibility

Loading, request failure, and an empty selected month are distinct states. An empty month shows zero summary figures, no bar segments, and an explanatory message; it does not fabricate rows. The table uses a semantic `<table>` inside a labelled scroll region with a caption, column headers, and a visible scroll hint on narrow screens. Month controls are buttons in a labelled group with `aria-pressed`; the year control has a visible label; the bar has a legend with names and amounts so colour is never the only carrier of meaning.

### D12: Testing strategy

- Unit tests cover month resolution, year options, absolute totals, transaction counts, ordering, top-eight aggregation, share percentages, zero handling, and hidden/uncategorised exclusion.
- Component tests replace `tests/components/analytics.test.ts` with Monthly tests: one fetch, default month, URL month, filters, hide scope, row links, empty/loading/failure states, and no chart component.
- Browser tests update the expense-type flow to `/monthly`, add a redirect check for `/analytics`, assert the month controls and table on phone and desktop, and remove the pie/panel assertions.
- Layout and document-title tests assert the `Monthly` label and `Monthly · Expenses` title.
- `tests/components/category-pie-chart.test.ts` is deleted with the component.

## Risks / Trade-offs

- **Absolute totals include incoming money** → The labels and subtitle say `Total moved` and `Absolute transaction totals`, and the table shows every category. A future sign-based product decision can change this in its own capability.
- **The years view disappears** → There is no yearly replacement in this change. The design's Yearly screen is the follow-up; the Monthly screen still reaches any represented month, and no data is lost.
- **Route rename breaks bookmarks** → `/analytics` redirects to `/monthly`, and the document title and navigation are updated together.
- **A month-link can name an unrepresented year** → The year options add that year so the selection remains visible; the page shows the empty-month state instead of silently switching months.
- **Hiding uncategorised can make a month look empty** → The summary figures and the empty-state message are recomputed together, so the page never shows a total that disagrees with the rows.
- **Removing dependencies touches the shared install** → Run the pnpm install once and verify both darwin and linux arm64 native packages remain present, as the workspace requires.
- **The capability id still says "chart"** → The main spec title and purpose are updated; renaming the capability is a separate repository-wide operation and is not needed for behaviour.
- **The nav now reads Monthly, Monthly totals, Monthly average** → This is expected until the Yearly/analysis consolidation. Reordering or retiring the other two screens is out of scope.

## Migration Plan

1. Add `app/pages/monthly.vue` with the new screen and the new utility helpers.
2. Add the `/analytics` redirect, update the layout label/order/title, and add a test for the redirect.
3. Rewrite the component, browser, and unit tests; delete the pie-chart component and its test.
4. Remove the charting dependencies and stylesheet import; reinstall and verify the multi-platform native packages.
5. Run `openspec validate --strict`, the unit/component suites, the browser suite, and a production build.

Rollback is a normal code revert: the route, page, layout, utilities, dependencies, and tests are all in this change, and there is no stored-data migration. The only persistent effect is a bookmarkable `/monthly` URL; `/analytics` continues to work through the redirect until the revert removes it.
