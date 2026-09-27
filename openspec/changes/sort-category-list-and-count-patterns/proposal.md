# Proposal

## Why

The categories list currently exposes every regular expression inline, making the overview noisy and less scannable. Showing each category's expression count instead, and sorting the list by category name, makes it easier to find and compare categories while keeping the expressions available in the existing edit form.

## What Changes

- Replace the regular-expression values in each category-list row with the number of expressions configured for that category.
- Sort category rows alphabetically by name, case-insensitively, using category identity as a stable tie-breaker.
- Keep expression values available in the create and edit forms; do not change the category API response or its identity-based ordering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management-screen`: change the category list to show expression counts rather than expression values and to order rows by category name.

## Impact

- Affects the category list in `app/pages/categories.vue` and the `category-management-screen` behavior contract.
- The existing `GET /api/categories` response, category editing behavior, database, and dependencies remain unchanged.
