import { expect, test } from '@playwright/test';

test('transactions default to uncategorised and retain full-response counts', async ({ page }) => {
  let transactionRequests = 0;
  await page.route('**/api/transactions', async (route) => {
    transactionRequests += 1;
    await route.fulfill({
      json: [
        {
          id: '1',
          bookingDate: '2026-09-28',
          valueDate: '2026-09-28',
          amount: '-12.50',
          purpose: 'Uncategorised purchase',
          counterpartyName: 'Local shop',
          counterpartyAccount: null,
          category: null,
        },
        {
          id: '2',
          bookingDate: '2026-09-27',
          valueDate: '2026-09-27',
          amount: '-25.00',
          purpose: 'Categorised purchase',
          counterpartyName: 'Market',
          counterpartyAccount: null,
          category: { id: '3', name: 'Groceries' },
        },
      ],
    });
  });

  await page.goto('/');

  const uncategorisedOption = page.getByRole('radio', { name: 'Uncategorised (1)' });
  const allOption = page.getByRole('radio', { name: 'All transactions (2)' });
  const tableBody = page.locator('tbody');
  await expect(uncategorisedOption).toBeChecked();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(tableBody).toContainText('Uncategorised purchase');
  await expect(tableBody).not.toContainText('Categorised purchase');
  expect(transactionRequests).toBe(1);

  await allOption.check();

  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(tableBody).toContainText('Uncategorised purchase');
  await expect(tableBody).toContainText('Categorised purchase');
  await expect(allOption).toBeChecked();
  await expect(uncategorisedOption).toBeVisible();
  expect(transactionRequests).toBe(1);
});
