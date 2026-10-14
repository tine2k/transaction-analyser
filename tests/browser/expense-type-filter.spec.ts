import { expect, test, type Page } from '@playwright/test';

// The expense-type filter on the three analysis screens. The API is intercepted,
// so the checks exercise the controls and the rendered output rather than live
// transaction data.
//
// See openspec/changes/add-category-expense-type/specs/category-spending-chart/spec.md
// and openspec/changes/add-category-expense-type/specs/monthly-category-totals-table/spec.md
// and openspec/changes/add-category-expense-type/specs/monthly-category-average/spec.md

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
    category: { id: '3', name: 'Internal', hidden: false, expenseType: null },
  },
];

async function interceptTransactions(page: Page): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: transactions });
  });
}

test('the analytics filter defaults to all and narrows the charts', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/analytics', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('expense-type-all')).toBeChecked();
  const currentPanel = page.locator(`[data-testid="month-panel"][data-month-key="${currentMonth}"]`);
  await expect(currentPanel.getByTestId('category-total')).toHaveCount(3);

  await page.getByTestId('expense-type-recurring').check();
  await expect(currentPanel.getByTestId('category-total')).toHaveCount(1);
  await expect(currentPanel).toContainText('Groceries');
  await expect(currentPanel).not.toContainText('New car');
  await expect(currentPanel).not.toContainText('Internal');

  await page.getByTestId('expense-type-one-time').check();
  await expect(currentPanel.getByTestId('category-total')).toHaveCount(1);
  await expect(currentPanel).toContainText('New car');
});

test('the monthly totals filter narrows the table', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly-totals', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('expense-type-all')).toBeChecked();
  await expect(page.getByTestId('category-heading')).toHaveCount(3);

  await page.getByTestId('expense-type-recurring').check();
  await expect(page.getByTestId('category-heading')).toHaveCount(1);
  await expect(page.getByTestId('category-heading').first()).toHaveText('Groceries');

  await page.getByTestId('expense-type-one-time').check();
  await expect(page.getByTestId('category-heading')).toHaveCount(1);
  await expect(page.getByTestId('category-heading').first()).toHaveText('New car');
});

test('the monthly average filter narrows the list', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly-average', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('expense-type-all')).toBeChecked();
  await expect(page.getByTestId('category-average')).toHaveCount(3);

  await page.getByTestId('expense-type-recurring').check();
  await expect(page.getByTestId('category-average')).toHaveCount(1);
  await expect(page.getByTestId('category-average').first()).toContainText('Groceries');

  await page.getByTestId('expense-type-one-time').check();
  await expect(page.getByTestId('category-average')).toHaveCount(1);
  await expect(page.getByTestId('category-average').first()).toContainText('New car');
});
