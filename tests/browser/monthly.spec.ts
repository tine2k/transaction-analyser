import { expect, test, type Page } from '@playwright/test';

// The Monthly screen replaced the Analytics screen. The old path redirects, and
// the selected month lives in the query so a month can be linked to directly.
//
// See openspec/changes/replace-analytics-with-monthly-screen/specs/category-spending-chart/spec.md
// and design.md D2 and D3.

const anna = { id: '2', name: 'Anna' };

const transactions = [
  {
    id: '1',
    bookingDate: '2025-03-05',
    valueDate: '2025-03-05',
    amount: '-10.00',
    purpose: 'March shop',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: anna,
    category: { id: '7', name: 'Groceries', hidden: false, expenseType: null },
  },
  {
    id: '2',
    bookingDate: '2025-04-05',
    valueDate: '2025-04-05',
    amount: '-20.00',
    purpose: 'April rent',
    counterpartyName: 'Landlord',
    counterpartyAccount: null,
    person: anna,
    category: { id: '8', name: 'Rent', hidden: false, expenseType: null },
  },
  {
    id: '3',
    bookingDate: '2024-04-05',
    valueDate: '2024-04-05',
    amount: '-30.00',
    purpose: 'Previous year',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    person: anna,
    category: { id: '9', name: 'Travel', hidden: false, expenseType: null },
  },
];

async function interceptTransactions(page: Page): Promise<void> {
  await page.route('**/api/transactions', async (route) => {
    await route.fulfill({ json: transactions });
  });
}

test('the former analytics path redirects to the Monthly screen', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/analytics', { waitUntil: 'networkidle' });

  await expect(page).toHaveURL(/\/monthly$/);
  await expect(page.getByRole('heading', { name: 'Monthly' })).toBeVisible();
  await expect(page).toHaveTitle('Monthly · Expenses');
});

test('a month link selects that month, and changing month or year keeps the person', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/monthly?month=2025-03&person=2', { waitUntil: 'networkidle' });

  await expect(page.locator('[data-testid="month-pill"][data-month-key="2025-03"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('year-select')).toHaveValue('2025');
  await expect(page.getByTestId('category-row')).toHaveCount(1);
  await expect(page.getByTestId('category-row')).toContainText('Groceries');

  await page.locator('[data-testid="month-pill"][data-month-key="2025-04"]').click();
  await expect(page).toHaveURL(/month=2025-04/);
  await expect(page).toHaveURL(/person=2/);
  await expect(page.getByTestId('category-row')).toContainText('Rent');

  await page.getByTestId('year-select').selectOption('2024');
  await expect(page).toHaveURL(/month=2024-04/);
  await expect(page).toHaveURL(/person=2/);
  await expect(page.locator('[data-testid="month-pill"][data-month-key="2024-04"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('category-row')).toContainText('Travel');
});
