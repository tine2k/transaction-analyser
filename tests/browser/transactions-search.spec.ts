import { expect, test, type Page } from '@playwright/test';

// All-transactions search on the transactions table. The API is intercepted, so
// the checks exercise the rendered filtering, the paused filter controls, the
// route query, and the reload and clear behaviour in headless Chromium.
//
// See openspec/changes/add-transaction-search/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();
const olderYear = currentYear - 2;

const categories = [
  { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: [], hidden: false, windows: [] },
];

const transactions = [
  {
    id: '1',
    bookingDate: `${olderYear}-03-01`,
    valueDate: `${olderYear}-03-01`,
    amount: '-12.50',
    purpose: 'Card payment Market',
    counterpartyName: 'Müller GmbH',
    counterpartyAccount: 'AT61 1904 3002 3457 3201',
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: '2',
    bookingDate: `${currentYear}-02-10`,
    valueDate: `${currentYear}-02-10`,
    amount: '4.00',
    purpose: 'February travel',
    counterpartyName: 'Rail',
    counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '3',
    bookingDate: `${currentYear}-02-15`,
    valueDate: `${currentYear}-02-15`,
    amount: '-0.25',
    purpose: 'Uncategorised purchase',
    counterpartyName: 'Shop',
    counterpartyAccount: 'AT99',
    categoryAssignment: 'automatic',
    category: null,
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

test('searching spans every transaction, pauses the filters, and survives a reload', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  expect(await shownIds(page)).toEqual(['3']);
  await expect(page.getByTestId('category-filter')).toHaveValue('uncategorised');
  await expect(page.getByTestId('period-filter')).toHaveValue(String(currentYear));

  await page.getByTestId('transaction-search').fill('market');

  await expect.poll(() => shownIds(page)).toEqual(['1']);
  await expect(page.getByTestId('category-filter')).toBeDisabled();
  await expect(page.getByTestId('period-filter')).toBeDisabled();
  await expect(page.getByTestId('filters-paused-note')).toContainText('Filters are paused while searching');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('market');

  await page.reload({ waitUntil: 'networkidle' });

  await expect(page.getByTestId('transaction-search')).toHaveValue('market');
  expect(await shownIds(page)).toEqual(['1']);
  await expect(page.getByTestId('category-filter')).toBeDisabled();
  await expect(page.getByTestId('period-filter')).toBeDisabled();

  await page.getByTestId('clear-search').click();

  await expect.poll(() => shownIds(page)).toEqual(['3']);
  await expect(page.getByTestId('category-filter')).toBeEnabled();
  await expect(page.getByTestId('category-filter')).toHaveValue('uncategorised');
  await expect(page.getByTestId('period-filter')).toHaveValue(String(currentYear));
  await expect(page.getByTestId('filters-paused-note')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBeNull();
});

test('a search that matches nothing explains the result', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.getByTestId('transaction-search').fill('zzz');

  await expect(page.getByText(/There are no transactions matching/)).toBeVisible();
  await expect(page.getByTestId('visible-count')).toHaveText('0 transactions');
  await expect(page.getByTestId('filters-paused-note')).toBeVisible();
});
