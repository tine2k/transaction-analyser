# Proposal

## Why

The default layout constrains its header and page content to a centered `max-w-5xl` column, so on larger screens the application leaves wide unused margins and the transactions table is squeezed into a narrow band. The table is the application's main surface and benefits from the horizontal room a wide display offers.

## What Changes

- The default layout's header and page container SHALL span the full width of the viewport instead of a centered maximum-width column.
- The layout SHALL keep a horizontal padding inset so content is not flush against the viewport edge.
- The existing max-width constraint (`max-w-5xl`) is removed from the frame; no other layout behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: The "Every route renders inside one default layout" requirement gains a statement that the page container spans the full viewport width (with a horizontal inset), replacing the implicit centered narrow column.

## Impact

- `app/layouts/default.vue`: the header container and `<main>` container drop `max-w-5xl` and keep `w-full` plus padding.
- No change to routes, data flow, the read API, dependencies, or the transactions table markup.
- Existing spec `openspec/specs/frontend-shell/spec.md` gains a delta for the layout requirement.
