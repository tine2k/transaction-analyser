# Proposal

## Why

The narrow-viewport menu disclosure control currently sits at the leading edge, ahead of the logo mark and `Expenses` wordmark, after the archived `move-mobile-menu-button-left` change. That placement separates the application identity from the edge and puts the navigation affordance where the rest of the masthead does not expect it. Moving the control to the trailing edge restores the identity as the leading item and puts the menu control in the right-hand corner users reach for on a phone.

## What Changes

- On narrow viewports, the menu disclosure control moves to the trailing (right) edge of the masthead, after the logo mark and `Expenses` wordmark.
- The masthead row is justified between its two children, so the brand group stays at the leading edge and the control sits against the trailing content edge.
- The logo mark and `Expenses` wordmark remain adjacent, in that order, at the leading edge.
- The disclosure control's existing accessible name, `aria-controls`, `aria-expanded` state, keyboard activation, icon swap, 44px square target, and `data-testid` contract are unchanged.
- The desktop masthead layout is unchanged: the control stays hidden from `md` up and the five bar links remain directly visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the menu bar requirement changes the narrow-viewport placement of the disclosure control from the leading edge to the trailing edge, after the application identity.

## Impact

- `app/layouts/default.vue`: masthead markup order and row justification for the narrow-viewport row.
- `tests/components/layout.test.ts`: assertions about the masthead's control placement.
- `tests/browser/responsive.spec.ts`: browser checks for the mobile toggle's position.
- No API, data, or dependency changes.
