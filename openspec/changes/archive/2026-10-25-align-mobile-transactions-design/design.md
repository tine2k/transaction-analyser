# Design

## Context

See `proposal.md` for motivation and the five delta specs for the required behavior.

The design source is `design/Finance Tracker Design.html`. Its `Transactions – Mobile` frame is 390px wide and uses a self-contained HTML template:

- brand bar with the `Expenses` wordmark and a menu button;
- a flat white filter sheet with a full-width search field and Search action, a two-column Year/Month row, and a full-width Category select;
- one white transaction card per row, 18px corners, 16px padding, and a 10px internal gap, carrying purpose and amount on top, the category pill, then `Booked` and `Value` dates;
- a full-width primary **Load more** button.

The current implementation in `app/pages/index.vue` always renders a semantic table inside `[data-testid="transactions-scroll"]`; the table is horizontally scrollable below `sm`. The filter sheet stacks labelled Search, Person, Period, and Category controls. Progressive disclosure always uses the intersection sentinel. `app/layouts/default.vue` caps both the masthead's inner content and `<main>` at 1280px. The archived `align-transactions-screen-design` change deliberately did not adopt the mobile cards, Load more button, or full-width frame.

Constraints from the existing implementation and specs:

- The eight transaction values, category assignment, manual marker, update marker, search, filters, sorting, and selection must all survive.
- `responsive-frontend` requires 44px touch targets and no page-level horizontal overflow.
- `transaction-table` requires progressive batches and forbids Previous/Next pagination and grouping.
- `manual-category-assignment` requires per-row selection and a select-all control.
- `transaction-pattern-shortcut` requires the action bar only for a selection within one field of one transaction.
- The mobile menu starts collapsed and that must not change.

## Goals / Non-Goals

**Goals:**

- Match the mobile mock's card and filter-sheet composition at phone widths.
- Keep every current transaction capability available on the card view.
- Use the mock's explicit Load more batching on phones while keeping scroll batching on desktop.
- Remove every desktop maximum-width constraint from the shared frame and masthead.
- Keep the desktop table, its columns, and all of its interactions unchanged apart from the frame width.
- Make the change verifiable with computed-style and DOM browser checks rather than screenshot baselines.

**Non-Goals:**

- Adopting the mock's palette values, radial brand-bar overlays, income-green amounts, or the mock's five-column desktop table.
- Replacing Person + Period with the mock's separate Year and Month selects.
- Replacing the summary's displayed sum with the mock's period label, or changing the search placeholder and its searchable fields.
- Opening the mobile menu on load.
- Hiding counterparty, account, person, selection, markers, or sorting on phones.
- Redesigning the fixed bulk and pattern-shortcut bars.
- Server, API, database, or dependency changes.

## Gap Register

| Area | Mobile mock | Current | Resolution |
| --- | --- | --- | --- |
| Phone transaction content | Stacked cards | Horizontally scrolling table | Cards below `sm`; semantic table from `sm` up. |
| Card composition | Purpose + amount, pill, dates | One table row | Card with the same eight values grouped into labelled regions. |
| Phone filters | Search row, Year/Month row, Category full width | Four stacked labelled controls | Search + Search on one row; Person and Period side by side; Category full width; labels retained. |
| Phone sorting | None | Column headers | Compact labelled sort select plus direction control in the card toolbar. |
| Phone progressive disclosure | Load more button | Scroll sentinel | Explicit Load more button; desktop keeps the sentinel. |
| Phone select-all | None | Table header checkbox | Select-all checkbox in the card toolbar. |
| Phone menu | Open on load | Collapsed on load | Keep collapsed; the existing accessible disclosure wins. |
| Phone amount colour | Green for income | Ink | Keep ink; the spec forbids colour-coded amounts. |
| Phone summary | Count + period label | Count + displayed sum | Keep the sum; the existing summary contract wins. |
| Brand bar | Radial overlays plus palette shift | Linear brand-token gradient | Keep the current brand bar; the change is width and card layout, not palette. |
| Search placeholder | `Purpose or category…` | `Purpose, counterparty, account` | Keep the current accurate placeholder and searchable fields. |
| Frame width | 1280px desktop bound | 1280px header and main bound | Full viewport width with padding; the mock's desktop bound is explicitly not adopted. |

## Decisions

### D1: Cards below `sm`, table from `sm` up

Use `(max-width: 639.98px)` as the phone presentation query, matching Tailwind's `sm` breakpoint at 640px. Render one presentation at a time from a reactive `phoneViewport` flag rather than rendering both and hiding one with CSS.

Rationale: a single tree avoids duplicate `data-transaction-id` attributes, duplicate category selects, duplicate test ids, and duplicate focusable controls that CSS hiding would still leave in the DOM. It also keeps the existing table tests running at desktop widths while mobile tests see only cards. Alternative: render both trees and hide one; rejected for the duplication and test ambiguity. Alternative: create a second route; rejected because the route and its behavior are unchanged.

The flag is initialised from `window.matchMedia` at setup when available and updated on its `change` event. A missing `matchMedia` implementation, as in some component-test environments, falls back to the table so existing component tests remain meaningful. When the flag changes, the batch observer is disconnected on phones and re-armed on desktop.

### D2: A card carries every value, not only the mock's subset

The card follows the mock's visible hierarchy but keeps the data contract:

- top row: selection checkbox, purpose, amount;
- category row: the existing category pill/select and the manual/update markers;
- meta row: `Booked <date>` and `Value <date>`;
- detail rows: counterparty, counterparty account (or the explicit absence), and person.

Mark each display region with `data-transaction-field` and keep `data-transaction-id` on the card. This lets the pattern shortcut accept a selection within one card field without accepting a selection across fields, and it lets the category assignment, markers, and memoisation reuse the existing row objects.

Rationale: `transaction-table` and `responsive-frontend` require every transaction value to remain available; the mock simply omits fields that the current capability owns. Alternative: show only the mock's five visible values on phones; rejected because it hides data. Alternative: keep a hidden table for the missing values; rejected because hidden content is not available to the reader.

Visual values: 18px corner radius (`rounded-panel-mobile`), surface ground, flat resting elevation, 16px padding, 10px internal gap, 15px/700 purpose, 15px/800 amount in ink, 12px/700 category pill, 12px muted meta and detail text. Cards are separated by the page's 14px mobile section gap.

### D3: The card toolbar owns selection, sorting, and batching on phones

Place a toolbar above the cards with:

- a select-all checkbox labelled `Select all shown transactions`, using the existing `select-all-visible` behavior and its all/some/none state;
- a labelled `Sort by` select offering `Default order` plus the eight value columns;
- a direction button that is disabled when no sort is active and toggles ascending/descending otherwise;
- a full-width `Load more` button below the cards, shown only while `hasMoreRows()`.

The sort control writes the same `sort`/`direction` route query as the table headers. Selecting `Default order` removes both query values. The direction button toggles the active sort without changing the column.

Rationale: the mock has no sorting or select-all UI, but dropping either would remove an existing capability. A compact toolbar keeps both without turning the card into a control panel. Alternative: keep a horizontally scrolling table header above the cards; rejected because it is visually a table fragment and harder to operate at 320px. Alternative: drop sorting on phones; rejected because the capability is not presentation-specific.

### D4: Load more is a phone-only batch trigger

`extendPresentation()` remains the single batching entry point. On desktop the sentinel and `IntersectionObserver` call it as they do now. On phones the sentinel is not rendered, and the Load more button calls the same function. The existing view-change restart, batch generation guard, and "present all when the observer is unavailable" fallback stay in place.

Rationale: the mock's explicit button is compatible with the existing batch state machine; only the trigger changes. It also makes the phone behavior predictable when the card list is short enough that a sentinel would fire immediately. Alternative: keep the sentinel on phones and add a button; rejected because the list would append without the reader asking, contradicting the mock. Alternative: client-side paging; rejected because the spec forbids Previous/Next pagination and the batch model already exists.

### D5: Mobile filter sheet uses the mock's arrangement with the current filters

Keep the current Person, combined Period, and Category filters. At phone widths:

- the search label stays visually above the field; the field and Search action share one row;
- the Clear action, when present, sits below that row rather than squeezing the field;
- Person and Period each take one column of a two-column grid;
- Category spans both columns;
- labels remain visible at 12px/700 so the controls are not placeholder-only.

From `md` up, the existing two-column and `xl` four-column arrangements remain, with Category spanning the two-column layout and occupying one track in the four-column layout.

Rationale: the chosen scope keeps the combined Period filter and Person filter. Visible labels preserve the current accessible naming and the spec's label scale; the mock's missing labels are a visual simplification, not a capability change. Alternative: hide labels on phones; rejected because it weakens the phone form and the visible label already has a defined style.

### D6: Full-width frame, no route-level maximum

Remove `mx-auto max-w-[1280px]` from the masthead's inner `div` and from `<main>` in `app/layouts/default.vue`. Keep `w-full min-w-0` and the existing padding: 16px horizontal on phones and 40px from `sm` up; 20px/32px vertical on phones and 32px/64px from `sm` up. Keep the masthead's left-aligned wordmark and navigation.

Rationale: `frontend-shell` already says the frame must span the viewport; the 1280px rule was the contradiction. Full width is a frame decision, not a requirement that every form fill the screen: the categories, people, monthly-average, and other forms keep their `max-w-2xl` readable widths. Alternative: keep the bound but let only the Transactions sheet exceed it; rejected because the user chose the whole frame and all routes. Alternative: use a very large maximum width; rejected because the requirement says no centred maximum-width column.

### D7: Reuse the table's row objects, assignment path, and memoisation

The card list iterates the same `presentedTransactions` array as the table. `v-memo="rowMemo(transaction)"` keeps assignment refreshes from rebuilding unaffected cards. `chooseRowCategory`, `toggleSelected`, `markers`, `inFlight`, `bulkBarVisible`, and `shortcutVisible` are shared unchanged. The pattern shortcut's selection helper is widened from a `td` match to a `td, [data-transaction-field]` match and finds the transaction from the nearest `[data-transaction-id]`.

Rationale: the card is another presentation of the same row, not a second data path. This preserves the in-place refresh, marker, and selection contracts and avoids a parallel assignment implementation.

### D8: Verify with DOM and computed styles

Extend the browser specs with:

- desktop frame checks at 1720px: masthead inner and `main` width equal the viewport, `max-width` is `none`, and the 40px horizontal padding remains;
- a non-Transactions route check at 1720px to prove the frame change is global;
- phone card checks at 390px and 320px: no table region, cards present, all eight values present, card radius/padding/gap, ink amount, category assignment still enabled;
- toolbar checks: select-all, sort column, direction toggle, Load more appends and disappears, all controls at least 44px high;
- filter-sheet checks: search + Search row, Person/Period two-column, Category full width, labels accessible;
- pattern-shortcut checks inside one card field and not across two fields;
- updated responsive checks that the phone Transactions route has no table scroll region while category, people, and monthly totals still do.

No screenshot baseline is added; computed styles and DOM contracts are stable and directly express the specs.

## Risks / Trade-offs

- **The reactive breakpoint can flash the table before the first mobile measurement** → initialise the flag synchronously from `window.matchMedia` during client setup and guard for environments without it. The application has SSR disabled, so setup runs in the browser.
- **Component tests run without `matchMedia`** → fall back to the desktop table when the API is absent; add browser coverage for cards rather than forcing happy-dom to emulate the media query.
- **A single tree makes the card and table markup diverge over time** → both render from `presentedTransactions` and share memoisation, assignment handlers, selection state, and summary; keep the card fields aligned with the eight table columns.
- **The card toolbar can crowd 320px** → stack select-all above the sort row, let the sort select shrink with `min-w-0`, and keep the direction and Load more actions at 48px.
- **Load more is a new control the mock did not previously have in the app** → treat it as a batch trigger, not paging; the spec explicitly permits it and still forbids Previous/Next and grouping.
- **Full width can make dense tables and filter rows very wide** → keep forms at their readable widths, let tables fill the frame, and verify all seven routes at 320/768/1280/1720 for page-level overflow.
- **The desktop table may still overflow at `sm`** → keep the existing `transactions-scroll` region and its horizontal scrolling from `sm` up, while phones use cards.
- **The mock's open menu is not adopted** → keep the collapsed disclosure and its expanded-state contract; the mobile navigation is outside this change's visual alignment.

## Migration Plan

1. Change the shared layout to the full-width frame and update the frame/computed-style tests.
2. Add the phone viewport flag and the card presentation beside the existing table, reusing the row state and assignment handlers.
3. Move the mobile filter sheet to the mock's arrangement and add the card toolbar.
4. Split batching into the desktop sentinel and the phone Load more button; re-arm the observer when the viewport changes.
5. Widen the pattern-shortcut field matching and update the browser and component tests.
6. Run the unit, component, and browser suites with the disposable PostgreSQL test database; inspect the Transactions route headlessly at 390×1500, 320×640, 768×1024, 1280×800, and 1720×1200.
7. Rollback is a single revert. No data, API, configuration, or dependency migration is involved.
