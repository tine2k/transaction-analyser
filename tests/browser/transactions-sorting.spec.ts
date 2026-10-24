import { expect, test, type Page } from '@playwright/test';

// Column-header sorting on the transactions table. The API is intercepted, so
// the checks exercise the rendered table, the active header state, the route
// query, and the persistence of the sort across a reload and a filter change.
//
// See openspec/changes/add-transaction-table-sorting/specs/transaction-table/spec.md

const categories = [
  { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: [], hidden: false, windows: [] },
];

const transactions = [
  {
    id: '1',
    bookingDate: '2026-02-01',
    valueDate: '2026-02-01',
    amount: '-12.50',
    purpose: 'Groceries',
    counterpartyName: 'Market',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: '2',
    bookingDate: '2026-02-02',
    valueDate: '2026-02-02',
    amount: '4.00',
    purpose: 'Travel',
    counterpartyName: 'Rail',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Travel', hidden: false },
  },
  {
    id: '3',
    bookingDate: '2026-02-03',
    valueDate: '2026-02-03',
    amount: '-2.00',
    purpose: 'alpha',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: '4',
    bookingDate: '2026-02-04',
    valueDate: '2026-02-04',
    amount: '9.99',
    purpose: 'Zeta',
    counterpartyName: 'Bank',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
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

function header(page: Page, column: string) {
  return page.locator('thead th', { has: page.getByTestId(`sort-${column}`) });
}

test('sorting a header updates the row order, the announced direction, and the URL', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/?category=all', { waitUntil: 'networkidle' });

  await expect(page.locator('thead th[aria-sort]')).toHaveCount(8);
  expect(await shownIds(page)).toEqual(['1', '2', '3', '4']);

  await page.getByTestId('sort-amount').click();

  await expect(header(page, 'amount')).toHaveAttribute('aria-sort', 'ascending');
  expect(await shownIds(page)).toEqual(['1', '3', '2', '4']);
  await expect(page).toHaveURL(/sort=amount/);
  await expect.poll(() => new URL(page.url()).searchParams.get('direction')).toBe('asc');

  await page.getByTestId('sort-amount').click();

  await expect(header(page, 'amount')).toHaveAttribute('aria-sort', 'descending');
  expect(await shownIds(page)).toEqual(['4', '2', '3', '1']);
  await expect.poll(() => new URL(page.url()).searchParams.get('direction')).toBe('desc');

  await page.getByTestId('sort-purpose').click();

  await expect(header(page, 'purpose')).toHaveAttribute('aria-sort', 'ascending');
  await expect(header(page, 'amount')).toHaveAttribute('aria-sort', 'none');
  expect(await shownIds(page)).toEqual(['3', '1', '2', '4']);
  await expect(page).toHaveURL(/sort=purpose/);
});

test('the sorted view survives a reload and a filter change', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/?category=all&sort=purpose&direction=asc', { waitUntil: 'networkidle' });

  await expect(header(page, 'purpose')).toHaveAttribute('aria-sort', 'ascending');
  expect(await shownIds(page)).toEqual(['3', '1', '2', '4']);

  await page.reload({ waitUntil: 'networkidle' });

  await expect(header(page, 'purpose')).toHaveAttribute('aria-sort', 'ascending');
  expect(await shownIds(page)).toEqual(['3', '1', '2', '4']);
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('purpose');
  await expect.poll(() => new URL(page.url()).searchParams.get('direction')).toBe('asc');

  await page.getByTestId('category-filter').selectOption('1');

  await expect(header(page, 'purpose')).toHaveAttribute('aria-sort', 'ascending');
  expect(await shownIds(page)).toEqual(['3', '1']);
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('1');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('purpose');
  await expect.poll(() => new URL(page.url()).searchParams.get('direction')).toBe('asc');
});
