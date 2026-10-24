import { expect, test, type Page } from '@playwright/test';

// Initial transaction filters in headless Chromium. The API is intercepted, so
// the check exercises the rendered defaults: the current calendar year and the
// period-aware uncategorised category default.
//
// See openspec/changes/default-transaction-period-and-category/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

const categories = [
  { id: '1', name: 'Groceries', patterns: [], hidden: false, windows: [] },
];

type FixtureTransaction = {
  id: string;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
  categoryAssignment: 'automatic';
  category: { id: string; name: string; hidden: boolean } | null;
};

function transaction(
  id: string,
  bookingDate: string,
  category: FixtureTransaction['category'],
): FixtureTransaction {
  return {
    id,
    bookingDate,
    valueDate: bookingDate,
    amount: '-1.00',
    purpose: `Transaction ${id}`,
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    categoryAssignment: 'automatic',
    category,
  };
}

async function interceptApi(page: Page, transactions: FixtureTransaction[]): Promise<void> {
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

test('defaults to the current year and uncategorised when that year holds one', async ({ page }) => {
  await interceptApi(page, [
    transaction('1', `${currentYear}-02-10`, null),
    transaction('2', `${currentYear}-02-11`, { id: '1', name: 'Groceries', hidden: false }),
    transaction('3', `${previousYear}-02-10`, null),
  ]);

  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('period-filter')).toHaveValue(String(currentYear));
  await expect(page.getByTestId('category-filter')).toHaveValue('uncategorised');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toHaveAttribute('data-transaction-id', '1');
  await expect(page.getByTestId('category-filter')).toContainText('All categories (3)');
  await expect(page.getByTestId('category-filter')).toContainText('Uncategorised (2)');
});

test('all periods can still be selected after the current-year default', async ({ page }) => {
  await interceptApi(page, [
    transaction('1', `${currentYear}-02-10`, null),
    transaction('2', `${previousYear}-02-10`, null),
  ]);

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('period-filter')).toHaveValue(String(currentYear));

  await page.getByTestId('period-filter').selectOption('all');

  await expect(page.getByTestId('period-filter')).toHaveValue('all');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect.poll(() => new URL(page.url()).searchParams.get('year')).toBeNull();

  await page.getByTestId('category-filter').selectOption('all');

  await expect(page.getByTestId('period-filter')).toHaveValue('all');
  await expect(page.locator('tbody tr')).toHaveCount(2);
});

test('defaults to all categories for a fully categorised current year', async ({ page }) => {  await interceptApi(page, [
    transaction('1', `${currentYear}-02-10`, { id: '1', name: 'Groceries', hidden: false }),
    transaction('2', `${currentYear}-03-10`, { id: '1', name: 'Groceries', hidden: false }),
    transaction('3', `${previousYear}-02-10`, null),
  ]);

  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('period-filter')).toHaveValue(String(currentYear));
  await expect(page.getByTestId('category-filter')).toHaveValue('all');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody tr').first()).toHaveAttribute('data-transaction-id', '1');
  await expect(page.locator('tbody tr').nth(1)).toHaveAttribute('data-transaction-id', '2');
});
