import { expect, test, type Page } from '@playwright/test';

// The expense-type filter on the analysis screens. The API is intercepted, so
// the checks exercise the controls and the rendered output rather than live
// transaction data.
//
// See openspec/changes/replace-analytics-with-monthly-screen/specs/category-spending-chart/spec.md
// and openspec/changes/replace-monthly-totals-with-yearly-screen/specs/monthly-category-totals-table/spec.md
// and openspec/specs/monthly-category-average/spec.md

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const bookingDate = `${currentMonth}-01`;

const transactions = [
  {
    id: '1',
    bookingDate,
    valueDate: bookingDate,
    amount: '-10.00',
    purpose: 'Supermarket',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '1', name: 'Groceries', hidden: false, expenseType: 'recurring' },
  },
  {
    id: '2',
    bookingDate,
    valueDate: bookingDate,
    amount: '-20.00',
    purpose: 'Car dealer',
    counterpartyName: 'Dealer',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '2', name: 'New car', hidden: false, expenseType: 'one-time' },
  },
  {
    id: '3',
    bookingDate,
    valueDate: bookingDate,
    amount: '-30.00',
    purpose: 'Transfer',
    counterpartyName: 'Own account',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    category: { id: '3', name: 'Internal', hidden: false, expenseType: null },
  },
];

async function interceptTransactions(page: Page): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: transactions });
  });
}

test('the monthly filter defaults to all and narrows the summary, bar, and table', async ({ page }) => {
  let transactionRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/transactions') {
      transactionRequests += 1;
    }
  });

  await interceptTransactions(page);
  await page.goto('/monthly', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('expense-type-all')).toBeChecked();
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 60.00');
  await expect(page.getByTestId('transaction-count-value')).toHaveText('3');
  await expect(page.getByTestId('category-row')).toHaveCount(3);
  await expect(page.getByTestId('bar-legend')).toContainText('Groceries');

  await page.getByTestId('expense-type-recurring').check();
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 10.00');
  await expect(page.getByTestId('transaction-count-value')).toHaveText('1');
  await expect(page.getByTestId('category-row')).toHaveCount(1);
  await expect(page.getByTestId('bar-legend')).toContainText('Groceries');
  await expect(page.getByTestId('bar-legend')).not.toContainText('New car');
  await expect(page.getByTestId('bar-legend')).not.toContainText('Internal');

  await page.getByTestId('expense-type-one-time').check();
  await expect(page.getByTestId('total-moved-value')).toHaveText('€ 20.00');
  await expect(page.getByTestId('transaction-count-value')).toHaveText('1');
  await expect(page.getByTestId('category-row')).toHaveCount(1);
  await expect(page.getByTestId('bar-legend')).toContainText('New car');
  await expect(page.getByTestId('bar-legend')).not.toContainText('Groceries');

  expect(transactionRequests).toBe(1);
});

test('the yearly filter narrows the table', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('expense-type-all')).toBeChecked();
  await expect(page.getByTestId('yearly-row')).toHaveCount(3);

  await page.getByTestId('expense-type-recurring').check();
  await expect(page.getByTestId('yearly-row')).toHaveCount(1);
  await expect(page.getByTestId('yearly-row').first()).toContainText('Groceries');

  await page.getByTestId('expense-type-one-time').check();
  await expect(page.getByTestId('yearly-row')).toHaveCount(1);
  await expect(page.getByTestId('yearly-row').first()).toContainText('New car');
});

test('the monthly average filter narrows the table', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly-average', { waitUntil: 'networkidle' });

  const typeFilter = page.getByTestId('expense-type-filter');
  await expect(typeFilter).toHaveValue('all');
  await expect(page.getByTestId('category-average')).toHaveCount(3);

  await typeFilter.selectOption('recurring');
  await expect(page.getByTestId('category-average')).toHaveCount(1);
  await expect(page.getByTestId('category-average').first()).toContainText('Groceries');

  await typeFilter.selectOption('one-time');
  await expect(page.getByTestId('category-average')).toHaveCount(1);
  await expect(page.getByTestId('category-average').first()).toContainText('New car');
});
