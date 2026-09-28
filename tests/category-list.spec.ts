import { expect, test } from '@playwright/test';

test('category list shows expression counts and sorts by name while edit retains expressions', async ({ page }) => {
  const categories = [
    { id: '10', name: 'Groceries', patterns: ['^groceries$', 'food'] },
    { id: '7', name: 'Alpha', patterns: ['^uppercase$'] },
    { id: '3', name: 'alpha', patterns: ['^lowercase$', '^second$'] },
  ];

  await page.route('**/api/categories/match-count', (route) => route.fulfill({ json: { count: 0 } }));
  await page.route('**/api/categories', (route) => route.fulfill({ json: categories }));

  await page.goto('/');
  await page.getByRole('link', { name: 'Categories' }).click();

  const table = page.getByRole('table');
  const rows = table.getByRole('row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1).getByRole('cell').nth(0)).toHaveText('alpha');
  await expect(rows.nth(1).getByRole('cell').nth(1)).toHaveText('2');
  await expect(rows.nth(2).getByRole('cell').nth(0)).toHaveText('Alpha');
  await expect(rows.nth(2).getByRole('cell').nth(1)).toHaveText('1');
  await expect(rows.nth(3).getByRole('cell').nth(0)).toHaveText('Groceries');
  await expect(rows.nth(3).getByRole('cell').nth(1)).toHaveText('2');

  for (const pattern of categories.flatMap((category) => category.patterns)) {
    await expect(table).not.toContainText(pattern);
  }

  await rows.nth(3).getByRole('button', { name: 'Edit' }).click();

  const expressionInputs = page.locator('form fieldset input[type="text"]');
  await expect(expressionInputs).toHaveCount(2);
  await expect(expressionInputs.nth(0)).toHaveValue('^groceries$');
  await expect(expressionInputs.nth(1)).toHaveValue('food');
});
