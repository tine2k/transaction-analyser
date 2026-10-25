import { expect, test, type Page } from '@playwright/test';

// The Yearly screen: one selected year as a category-by-month matrix, its two
// summary cards, the retained filters, and the cell links. The API is
// intercepted, so these checks exercise the rendered output rather than live
// transaction data.
//
// See openspec/changes/replace-monthly-totals-with-yearly-screen/specs/monthly-category-totals-table/spec.md

const transactions = [
  {
    id: '1',
    bookingDate: '2025-01-02',
    valueDate: '2025-01-02',
    amount: '-12.50',
    purpose: 'Supermarket',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
  {
    id: '2',
    bookingDate: '2025-01-03',
    valueDate: '2025-01-03',
    amount: '4.00',
    purpose: 'Refund',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
  {
    id: '3',
    bookingDate: '2025-03-04',
    valueDate: '2025-03-04',
    amount: '-7.00',
    purpose: 'Corner shop',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
  {
    id: '4',
    bookingDate: '2025-02-05',
    valueDate: '2025-02-05',
    amount: '-100.00',
    purpose: 'February rent',
    counterpartyName: 'Landlord',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '2', name: 'Rent', hidden: false, expenseType: 'one-time' },
  },
  {
    id: '5',
    bookingDate: '2025-02-06',
    valueDate: '2025-02-06',
    amount: '-2.00',
    purpose: 'Unknown',
    counterpartyName: 'Local shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: null,
  },
  {
    id: '6',
    bookingDate: '2025-02-07',
    valueDate: '2025-02-07',
    amount: '-5.00',
    purpose: 'Anna supermarket',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '2', name: 'Anna' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
];

async function interceptTransactions(page: Page, json: unknown = transactions): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json });
  });
}

test('the yearly screen presents a selected year, cards, matrix, and links', async ({ page }) => {
  let transactionRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/transactions') {
      transactionRequests += 1;
    }
  });

  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Yearly' })).toBeVisible();
  await expect(page.getByTestId('year-pill').filter({ hasText: '2025' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 130.50');
  await expect(page.getByTestId('average-value')).toHaveText('€ 10.88');
  await expect(page.getByTestId('average-divisor')).toHaveText('over 12 months');
  await expect(page.getByTestId('yearly-row')).toHaveCount(3);
  await expect(page.getByTestId('yearly-row').first()).toContainText('Rent');

  const groceries = page.getByTestId('yearly-row').filter({ hasText: 'Groceries' });
  const monthLink = groceries.getByTestId('yearly-month-link').first();
  await expect(monthLink).toHaveAttribute('href', /month=2025-01/);
  await expect(monthLink).toHaveAttribute('href', /category=1/);
  const totalLink = groceries.getByTestId('yearly-total-link');
  await expect(totalLink).toHaveAttribute('href', /year=2025/);
  await expect(totalLink).toHaveAttribute('href', /category=1/);

  expect(transactionRequests).toBe(1);
});

test('the yearly expense-type filter narrows rows and cards', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('expense-type-all')).toBeChecked();
  await expect(page.getByTestId('yearly-row')).toHaveCount(3);

  await page.getByTestId('expense-type-recurring').check();
  await expect(page.getByTestId('yearly-row')).toHaveCount(1);
  await expect(page.getByTestId('yearly-row').first()).toContainText('Groceries');
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 28.50');

  await page.getByTestId('expense-type-one-time').check();
  await expect(page.getByTestId('yearly-row')).toHaveCount(1);
  await expect(page.getByTestId('yearly-row').first()).toContainText('Rent');
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 100.00');
});

test('the yearly hide control removes uncategorised from rows and cards', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('yearly-row')).toHaveCount(3);
  await page.getByTestId('hide-uncategorised').check();
  await expect(page.getByTestId('yearly-row')).toHaveCount(2);
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 128.50');

  await page.getByTestId('hide-uncategorised').uncheck();
  await expect(page.getByTestId('yearly-row')).toHaveCount(3);
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 130.50');
});

test('the yearly person filter scopes the matrix and is carried in links', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025&person=2', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('person-filter')).toHaveValue('2');
  await expect(page.getByTestId('yearly-row')).toHaveCount(1);
  await expect(page.getByTestId('yearly-row').first()).toContainText('Groceries');
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 5.00');
  await expect(page.getByTestId('yearly-month-link').first()).toHaveAttribute('href', /person=2/);
});

test('the former monthly totals route redirects to yearly with its query', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly-totals?year=2025&person=2', { waitUntil: 'networkidle' });

  await expect(page).toHaveURL(/\/yearly\?/);
  const redirected = new URL(page.url());
  expect(redirected.searchParams.get('year')).toBe('2025');
  expect(redirected.searchParams.get('person')).toBe('2');
  await expect(page.getByRole('heading', { name: 'Yearly' })).toBeVisible();
  await expect(page.getByTestId('person-filter')).toHaveValue('2');
});

test('the yearly screen explains an empty year', async ({ page }) => {
  await interceptTransactions(page, []);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('yearly-row')).toHaveCount(0);
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 0');
  await expect(page.getByText('No category data for 2025.')).toBeVisible();
});

test('the yearly matrix scrolls within its own region on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('year-pill')).toHaveCount(2);
  await expect(page.getByTestId('yearly-row')).toHaveCount(3);
  const region = page.getByRole('region', { name: 'Yearly category matrix' });
  await expect(region).toBeVisible();
  await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(true);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
});
