import { expect, test, type Page } from '@playwright/test';

// The person column and filter on the transactions table, in headless Chromium.
// The API is intercepted, so the checks exercise the rendered column, the filter
// choices, the person-scoped rows, the URL-backed selection, and a search that
// stays within the selected person.
//
// See openspec/changes/add-people/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();
const olderYear = currentYear - 2;

const categories = [
  { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: [], hidden: false, windows: [] },
];

const transactions = [
  {
    id: '1',
    bookingDate: `${currentYear}-03-05`,
    valueDate: `${currentYear}-03-05`,
    amount: '-12.50',
    purpose: 'Anna market',
    counterpartyName: 'Market',
    counterpartyAccount: null,
    person: { id: '2', name: 'Anna' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: '2',
    bookingDate: `${olderYear}-03-05`,
    valueDate: `${olderYear}-03-05`,
    amount: '-4.00',
    purpose: 'Anna rail',
    counterpartyName: 'Rail',
    counterpartyAccount: null,
    person: { id: '2', name: 'Anna' },
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '3',
    bookingDate: `${currentYear}-03-06`,
    valueDate: `${currentYear}-03-06`,
    amount: '-9.00',
    purpose: 'Default market',
    counterpartyName: 'Market',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
];

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/transactions') {
      await route.fulfill({ json: transactions });
      return;
    }

    if (pathname === '/api/categories') {
      await route.fulfill({ json: categories });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function shownIds(page: Page): Promise<Array<string | null>> {
  return page.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-transaction-id')));
}

test('renders the person column and filters the rows by person', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/?category=all', { waitUntil: 'networkidle' });

  await expect(page.locator('thead th', { hasText: 'Person' })).toHaveCount(1);
  await expect(page.locator('[data-transaction-id="1"] td').nth(6)).toHaveText('Anna');
  await expect(page.locator('[data-transaction-id="3"] td').nth(6)).toHaveText('Default');
  await expect(page.getByTestId('person-filter').locator('option')).toHaveText([
    'All people',
    'Anna',
    'Default',
  ]);

  await page.getByTestId('person-filter').selectOption('2');

  await expect.poll(() => shownIds(page)).toEqual(['1']);
  await expect.poll(() => new URL(page.url()).searchParams.get('person')).toBe('2');
  await expect(page.getByTestId('category-filter').locator('option')).toHaveText([
    'All categories (2)',
    'Uncategorised (0)',
    'Groceries',
    'Travel',
  ]);

  await page.reload({ waitUntil: 'networkidle' });

  await expect(page.getByTestId('person-filter')).toHaveValue('2');
  expect(await shownIds(page)).toEqual(['1']);
});

test('a search stays within the selected person', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/?person=2&category=all', { waitUntil: 'networkidle' });

  await page.getByTestId('transaction-search').fill('market');
  await page.getByTestId('search-submit').click();

  await expect.poll(() => shownIds(page)).toEqual(['1']);
  await expect(page.getByTestId('filters-paused-note')).toContainText('person filter still applies');
  await expect.poll(() => new URL(page.url()).searchParams.get('person')).toBe('2');
  await expect(page.getByTestId('person-filter')).toBeEnabled();
});
