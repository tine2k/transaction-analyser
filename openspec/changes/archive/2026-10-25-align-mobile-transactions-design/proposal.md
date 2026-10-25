# Proposal

## Why

The design folder now carries a mobile `Transactions – Mobile` frame in `design/Finance Tracker Design.html`, and the current screen does not follow it: on a phone the app still shows a horizontally scrolling table where the mock shows stacked transaction cards. The previous design-alignment change deliberately stopped at typography and sheet metrics, leaving the mobile layout, filter arrangement, and progressive disclosure behind.

The frame width has also drifted. The current `frontend-shell` spec states both that the page container must span the full viewport and that the main frame must stop at a centred 1280px column, and the layout implements the 1280px bound. The desktop design mock shows that bound, but the product requirement is now the opposite: desktop layouts must use the full viewport width.

## What Changes

- **BREAKING** Present transactions as cards below the `sm` breakpoint and keep the semantic table at `sm` and above. The card follows the mobile mock: purpose and amount on the top row, the category pill below, and the booking and value dates in the meta row.
- Keep every existing transaction capability on mobile cards: all eight transaction values, row selection and select-all, category assignment and its markers, the pattern shortcut, and sorting. Cards add the compact toolbar controls the mock does not show.
- Replace scroll-triggered progressive disclosure on phones with the mock's **Load more** button. Desktop tables keep the existing scroll-triggered batches.
- Restyle the mobile filter sheet to the mock's arrangement: search field and Search action on one row, Person and Period side by side, Category full width. The current combined Period filter and Person filter are retained; the mock's separate Year and Month controls are not adopted.
- Keep the mobile menu collapsed on load, as `responsive-frontend` requires, rather than adopting the mock's initially open menu.
- **BREAKING** Remove the 1280px maximum width from the shared masthead and main frame on every route. Desktop content spans the viewport with the existing horizontal padding inset; readable forms keep their own narrower widths.
- Amend the transaction, responsive-layout, shell, assignment, and pattern-shortcut specs to describe the card presentation and the full-width frame instead of contradicting them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: the index route now presents transactions as cards on phones and a table from `sm` up; mobile cards offer sorting, a Load more batch control, and the mock's card metrics; the no-paging rule is narrowed to grouping and Previous/Next pagination.
- `responsive-frontend`: the phone transaction view is a card list rather than a horizontally scrolling table; the other wide tables keep their own scroll regions.
- `frontend-shell`: the shared masthead and main frame span the full viewport at desktop widths; the contradictory 1280px bound is removed, while the frame keeps its padding inset.
- `manual-category-assignment`: row selection and the select-all control are available in the mobile card toolbar as well as the desktop table header.
- `transaction-pattern-shortcut`: a valid text selection may sit inside one field of a mobile transaction card, not only inside a table cell.

## Impact

- **Frontend**: `app/layouts/default.vue`, `app/pages/index.vue`, and possibly `app/assets/css/main.css` and the two fixed action bars. No API, database, schema, or dependency changes.
- **Behaviour**: the desktop table keeps its columns, sorting, filtering, selection, batching, and assignment behavior. Phones gain a card view with a compact sort direction control, a select-all control, and a Load more button; the person and period filters and the collapsed menu stay.
- **Tests**: the browser suite pins the 1280px frame, the phone table region, horizontal table scrolling, and the scroll sentinel, so those assertions must move to desktop-only expectations and new card, toolbar, filter-sheet, and Load more checks must be added at 320px and 390px.
- **Documentation**: the change updates five capability specs and records the mobile component structure, the breakpoint, and the full-width decision in `design.md`.
