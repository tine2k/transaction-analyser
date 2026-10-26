# Design

## Context

See `proposal.md` — Why. The current phone presentations and their natural widths are:

| Screen | File | Phone presentation today | Natural width |
| --- | --- | --- | --- |
| Transactions | `app/pages/index.vue` | cards below `sm` (639.98px), table above | ~900px |
| Monthly | `app/pages/monthly.vue` | scroll region, `min-w-[720px]` | 720px |
| Yearly | `app/pages/yearly.vue` | scroll region, `min-w-[1100px]` | 1100px |
| Monthly average | `app/pages/monthly-average.vue` | scroll region, `min-w-[940px]` | 940px |
| Categories | `app/pages/categories.vue` | scroll region, `w-max` | content-sized |
| Imports | `app/pages/imports.vue` | scroll region, `w-max` | content-sized |
| People | `app/pages/people.vue` | scroll region, `w-max` | likely fits 390px |

At 390px the shared frame leaves about 358px of content width; at 320px about 288px. Each table already sits in a `role="region"` with a visible hint, `tabindex="0"`, and an accessible name. The breakpoint used by the transactions cards is `(max-width: 639.98px)`; the card/table choice is a reactive `matchMedia` flag with a table fallback when `matchMedia` is unavailable.

Constraints that shape the approach:

- `responsive-frontend` requires no page-level horizontal overflow, intentional scrolling confined to the region, 44px controls, and every value reachable.
- The semantic table contract for categories, people, Yearly, and Monthly must survive; the Monthly average card presentation is an explicit delta.
- The transactions card/table decision renders one tree at a time, not two hidden copies. The new card and expander presentations follow the same rule.
- No API, database, or dependency change.
- Verification is headless Chromium with DOM and computed-style assertions; there are no screenshot baselines.

## Goals / Non-Goals

**Goals:**

- Make each phone presentation fit the question its table answers: pinned labels and compact columns for comparison matrices, cards for a ranked category list, and priority plus detail for a diagnostic log.
- Keep every stored value present and reachable at 320px without page-level overflow.
- Keep desktop tables and their interactions unchanged.
- Make the scrolling affordance and row context observable and testable rather than relying on a text hint alone.

**Non-Goals:**

- Redesigning the Transactions cards or the People table.
- A half-year or quarter toggle for the Yearly matrix.
- A bottom sheet or dialog for import detail; the detail expands in place.
- Virtualisation, pagination, grouping, or a new data request.
- Changing palette, typography, elevation, or the frame.
- Introducing a component library or a new dependency.

## Decisions

### D1 — Choose the phone presentation per table, not one pattern for all

Use three treatments:

```
Comparison tables            Ranked record list          Diagnostic log
(Monthly, Yearly,            (Monthly average)            (Imports)
 Categories)
+------------------------+   +----------------------+     +----------------------+
| pinned label | scroll  |   | card per category    |     | priority columns     |
| compact cols | region  |   | exact values as text |     | + row expander       |
+------------------------+   +----------------------+     +----------------------+
```

Rationale: candidate cards for the Monthly average because it has three data values plus two decorative bars; candidate sticky scroll for Yearly/Monthly/Categories because cross-row and cross-month comparison is the task; candidate priority+detail for Imports because ten diagnostic fields are not read at once. The alternative — one pattern everywhere — either destroys the Yearly comparison or forces horizontal scrolling onto a list that does not need it.

### D2 — Sticky columns at the leading and trailing edges

Apply `position: sticky` to the relevant header and body cells:

- Monthly: Category header and row header, `left: 0`.
- Yearly: Category header and row header, `left: 0`.
- Categories: Name header and cell `left: 0`; Actions header and cell `right: 0`.

Each pinned cell gets an opaque background (`var(--color-surface)` unless the row has its own background), `z-index: 1`, and a one-pixel seam drawn with `box-shadow` rather than a border. This matters because the tables use `border-collapse: collapse`; a border on a sticky cell can detach from the row during scrolling. The seam is `box-shadow: 1px 0 0 var(--color-rule)` for leading pins and `box-shadow: -1px 0 0 var(--color-rule)` for trailing pins, suppressed on the outer edge.

Alternatives rejected:

- **Reorder columns so actions come first:** moves the row actions but loses the familiar trailing Actions column and still hides the name when scrolling.
- **A separate fixed column outside the table:** breaks header association and the semantic table contract.
- **Sticky only while scrolling via JavaScript:** unnecessary; CSS handles it and degrades to normal cells where sticky is unsupported.

### D3 — Compact phone metrics, with three-letter month labels

Use phone-first classes with `sm:` restoring the current desktop metrics:

- Yearly month headings: visible `Jan`…`Dec`; the table's natural width falls by roughly 200px through 6px horizontal cell padding and narrower month columns. The full month name is exposed through an `sr-only` span in each heading.
- Change the visible label from the planned two letters to **three** letters. `Ju` cannot distinguish June from July, and `Ja`/`Ju` collisions make a twelve-column matrix unreadable. The ~48px saved by two letters is not worth the ambiguity. Alternatives rejected: two letters with only an accessible full name (sighted readers still cannot tell the columns apart); no change (keeps the 1100px width).
- Monthly share column: replace the `w-[38%]` desktop share and 12px padding with a compact fixed share and 8px padding below `sm`; restore the desktop shares at `sm`.
- Categories: cap the pinned Name cell at `max-w-28` (7rem) below `sm` with `break-words`, and use 8px padding on the pinned cells. Common names stay on one line; a long name wraps rather than consuming the whole viewport. The full name remains present; it is never truncated.
- Row actions: icon-only 44x44 buttons with an `aria-label` that names the category and action, visible text labels from `sm` up.

Width budget at 320px for Categories: Name 112px + actions 108px leaves about 68px for the scrolling middle columns; at 390px it leaves about 138px. The middle values are counts and a short expense type, so a narrow window remains usable and every value is still reachable.

### D4 — Monthly table keeps Category pinned and Amount second

Render the Monthly columns as Category, Amount, Share, Transactions below `sm`, and as Category, Share, Transactions, Amount from `sm` up. Use a conditional column list rather than CSS order, because table columns cannot be reordered visually without reordering the DOM cells. The sticky Category cell uses D2.

Rationale: the amount is the row's key value and the share is derived from it. Putting Amount second means the first scroll reveals the number rather than the decorative share bar. Reordering changes no value, calculation, link target, or row order. Alternative rejected: pin both Category and Amount, which would consume roughly 216px of a 288px viewport and leave no room for the share.

### D5 — Monthly average becomes cards below `sm`

Use the same reactive `matchMedia` pattern as the transactions cards:

- `const PHONE_MEDIA_QUERY = '(max-width: 639.98px)'`, initialise from `window.matchMedia` when available, fall back to the table when it is not, and update on the `change` event.
- Render exactly one tree: cards when the flag is true, the semantic table otherwise. This avoids duplicate test ids, duplicate focusable controls, and duplicate values.
- Card content: category name and palette mark; a visible `Last N months` label over the trend bars; a labelled exact `<N>-month total`; a labelled exact `Avg / month`; the relative average bar. The trend and average bar stay `aria-hidden="true"`; the exact values remain as text.
- Keep the existing sort column, direction, window, person, and expense-type controls. Add a visible sort statement beside the sort controls below `sm`, since the table headers that carry the sort mark are absent.
- Reuse `sortedAverages`, `trendHeight`, `averageBarPercent`, `appliedMonthCount`, and `lastMonthsLabel`; do not duplicate the averaging logic.

Alternatives rejected:

- **Keep the table and only compact it:** five columns still leave the total and average off-screen and lose the row label at 320px.
- **A horizontally scrolling card row:** uses scrolling without gaining the comparison benefit of a table.
- **Render both tree and cards with CSS hiding:** duplicates controls and test ids, and hidden focusable controls remain a hazard.

### D6 — Imports uses priority columns and an in-row expander

Below `sm`, render a run row with Started, Source, Outcome, Written, and a disclosure cell. The disclosure toggles a second `<tr>` in the same `<tbody>` whose single `<td>` spans the phone column count and contains a `<dl>` with Person, Mode, Read, Already stored, Categorised, and Reason. From `sm` up, render the existing ten columns and no disclosure.

State is one `expandedRunId: Ref<string | null>`. The button carries `aria-expanded` and `aria-controls` pointing at the detail row, and its label names the run (start time and source) plus the action. The detail row is removed when collapsed so it is not announced as empty. Expanding makes no request. A refresh that removes a run clears the state if the id is no longer present.

Alternatives rejected:

- **CSS-hide desktop columns and duplicate the values in the detail:** duplicates test ids and values, and makes it ambiguous which copy is exposed to assistive technology.
- **A modal or bottom sheet:** more focus-management and dismiss behaviour than an in-place detail needs.
- **Drop the reason and diagnostic counts on phones:** hides data the log exists to show.

### D7 — Edge affordance with contained overscroll

Wrap each remaining scroll region in a positioned wrapper and draw the affordance on the wrapper, not on the scrolling element, so it stays at the edge while content moves. A passive scroll listener and a `ResizeObserver` set `data-overflow-start` / `data-overflow-end` on the wrapper; CSS shows a gradient-plus-shadow edge only on the side with more content. The existing hint text stays and remains the region's `aria-describedby`.

Add `overscroll-behavior-x: contain` to the region so a sideways drag inside it does not propagate to the page. The existing `html, body { overflow-x: hidden }` remains a backstop, not the affordance.

Rationale: a gradient/shadow edge is a luminance cue, not a hue cue, so it does not rely on colour alone. Alternatives rejected: a scrollbar-only cue (invisible on mobile), a permanent arrow overlay (obscures data), and a text hint alone (already present and not noticed).

### D8 — No shared viewport composable yet

The transactions screen already has an inline `phoneMediaQuery`/`phoneViewport` pattern. Repeat that small pattern in the two pages that need a one-tree switch (Monthly average and Imports) instead of introducing a composable and refactoring `index.vue`.

Rationale: the change is scoped away from the transactions screen; a new shared abstraction would touch it and add churn for two call sites. The risk is duplicated constant values; both new sites use the same `(max-width: 639.98px)` string and a table/desktop fallback, and a browser test pins the breakpoint. A later cleanup can extract the pattern once the mobile tables are settled.

### D9 — Verify layout and behaviour in headless Chromium

Add browser assertions, not screenshots:

- Monthly at 390px: at `scrollLeft = 0` the Category and Amount cells are both within the region's client rect; at the end, Category's `getBoundingClientRect().left` equals the region's left edge plus its border; the overflow affordance data attributes flip at the ends; `window.scrollX` stays 0.
- Yearly at 320px: after scrolling to the end, Category stays pinned, December and Total are reachable, and each month heading exposes the full name through an `sr-only` element.
- Categories at 320px: after scrolling, Name and Actions stay pinned; both icon buttons are at least 44x44 and have names containing the category name; every middle column is reachable.
- Monthly average at 390px: no table, one card per category, every exact value present, the trend is `aria-hidden`, and the sort statement updates when the column or direction changes; at 768px the table is present and the cards are absent.
- Imports at 390px: priority columns are visible before expansion; expanding reveals every remaining field in the same row; `aria-expanded` flips; no `/api/easybank/sync` request is made by expanding; at 768px the ten columns are present.
- Update `tests/browser/responsive.spec.ts`, which currently asserts `scrollWidth > clientWidth` for the Monthly average region at 390px and 768px; that assertion moves to the table-only widths.

## Risks / Trade-offs

- **Sticky cells can detach from collapsed borders** → Use `box-shadow` seams and an opaque background on every pinned cell; verify at both scroll ends.
- **A pinned cell with no background shows scrolling content through it** → Give the pinned cell the same background token as its row. If alternating row colours are added, apply the same class to the pinned cell, not `background: inherit`.
- **Long category names starve the scroll window** → Cap the pinned Name cell at 7rem and wrap; keep the full value and verify the 320px window still scrolls.
- **Three-letter month labels consume slightly more width than the planned two** → Accept the ~48px cost; verify December and Total remain reachable at 320px.
- **Cards make the Monthly average page long for many categories** → The page already lists every category; the card height is acceptable for a phone-sized ranked list. If a real dataset makes it unwieldy, windowing is a separate change.
- **The Monthly table may still scroll at 390px** → The requirement is reachability, not a no-scroll guarantee; the acceptance check is that Category and Amount are visible at the start and every value is reachable at 320px.
- **Expander rows with `colspan` can drift from the phone column count** → Derive the span from the same column list and test at both widths.
- **`overscroll-behavior-x` support** → Supported in current Chromium and Safari; `overflow-x: hidden` on the page remains a backstop.
- **The responsive suite's existing scroll assertions encode the old presentation** → Update the Monthly average assertions rather than weakening the other screens'.

## Migration Plan

No data, schema, API, or dependency change. Deploy is a frontend-only release. Rollback is a revert of the five page files and the scroll-affordance style; no stored state depends on the presentation.

## Open Questions

- The exact compact column widths for the Monthly and Yearly tables are tuning values. The browser tests assert reachability and visible key values, not a particular pixel width, so these can be adjusted during implementation without changing the specs.
- Whether the Monthly table fits 390px without scrolling is a target, not a requirement; leave the scroll region and its affordance in place either way.
