# Proposal

## Why

The category list stretches across the full page even when it holds little content, and its rows are hard to track across. Editing a category also leaves the user at the row they clicked while the form sits off-screen above it, so they must scroll up manually to make the change.

## What Changes

- Size the category table to its content instead of forcing it to the full container width, so it takes only the space it needs.
- Give category rows alternating background colors so adjacent rows are easy to tell apart.
- When Edit is clicked on a category, scroll the create/edit form into view smoothly so the loaded category is immediately visible for editing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management-screen`: the category list presentation (content-sized table and alternating row colors) and the edit flow (scrolling the edit form into view) change; listing, sorting, and write behavior stay as they are.

## Impact

- Affects the category list and edit flow in `app/pages/categories.vue`.
- No API, database, or dependency changes; `GET /api/categories` and the write endpoints keep their contracts.
- Existing category component tests are extended to cover the new presentation and scroll behavior.
