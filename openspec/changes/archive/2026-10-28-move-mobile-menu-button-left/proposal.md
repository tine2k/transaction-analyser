# Proposal

## Why

On narrow viewports the menu disclosure control sits at the trailing edge of the masthead, opposite the application identity. Placing it at the leading edge puts the primary mobile navigation affordance where users expect it and keeps it reachable with one-handed use.

## What Changes

- On narrow viewports, the menu disclosure control moves to the leading (left) edge of the masthead, before the logo mark and `Expenses` wordmark.
- The logo mark and `Expenses` wordmark remain adjacent and left-aligned directly after the control, so the identity still reads as a pair.
- The disclosure control's existing accessible name, `aria-controls`, `aria-expanded` state, keyboard activation, icon swap, and `data-testid` contract are unchanged.
- The desktop masthead layout is unchanged: the control stays hidden from `md` up and the five bar links remain directly visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the menu bar requirement gains the narrow-viewport placement of the disclosure control at the leading edge, ahead of the application identity.

## Impact

- `app/layouts/default.vue`: masthead markup order/classes for the narrow-viewport row.
- `tests/components/layout.test.ts`: assertions about the masthead's control placement.
- `tests/browser/responsive.spec.ts`: browser checks for the mobile toggle's position.
- No API, data, or dependency changes.
