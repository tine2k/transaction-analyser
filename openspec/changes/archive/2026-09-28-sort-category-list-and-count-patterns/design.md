# Design

## Context

The category endpoint returns each category with its `id`, `name`, and full `patterns` array, ordered by identity. The category screen currently uses that response array directly for list order and renders every pattern in the list row. The same category object also supplies the values shown when the user edits a category.

## Goals / Non-Goals

**Goals:**

- Present an alphabetically ordered overview with each category's expression count.
- Keep the full category data available to the existing create and edit workflows.

**Non-Goals:**

- Changing the category API response or its identity-based order.
- Hiding expressions from the create or edit forms.
- Changing category storage or expression matching.

## Decisions

- **Sort and summarize in the category screen, not the API.** The API's identity ordering is an existing contract, while alphabetical order is specific to this view. Derive the displayed order from category names (case-insensitively), using ascending numeric identity to break equal-name ties. This keeps the API contract and other consumers unchanged. Changing the endpoint's ordering was considered but rejected because it would couple a view preference to the management API.
- **Derive the displayed count from each returned `patterns` array.** Show its length in the list and do not render the pattern values there. Keep each full category object for the existing edit action, so users can still inspect and change expressions in the form. No additional request or count endpoint is needed.

## Risks / Trade-offs

- [The list's order differs from the API response order] → This is intentional and limited to the category screen; equal names use identity ordering for deterministic results.
- [A list-row change could accidentally remove edit data] → Keep the original category object attached to each row and verify the edit form still loads every expression.

## Migration Plan

No data or API migration is required. Deploy the screen change normally; rollback consists of reverting the category-list presentation change.
