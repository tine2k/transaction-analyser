# Tasks

## 1. Category-list presentation

- [x] 1.1 Update the category list to show each category's expression count and sort rows by case-insensitive name with identity as the tie-breaker; add headless Chromium coverage using categories returned out of order and verify the correct counts, absence of regex values from list rows, and availability of every expression in the Edit form.

## 2. Integration verification

- [ ] 2.1 Run `npm run build` and the headless Chromium UI suite with `TEST_DATABASE_URL` pointing to a disposable PostgreSQL database seeded only with test fixtures; verify the new list behavior and that existing category management flows still pass without changing the API response.
