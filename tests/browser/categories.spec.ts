import { expect, test, type Page } from '@playwright/test';

// The category screen's table presentation and edit flow. The API is intercepted,
// so the check exercises the screen rather than live category data.
//
// See openspec/changes/polish-categories-table/specs/category-management-screen/spec.md
// and openspec/changes/center-categories-table-cells/specs/category-management-screen/spec.md

const categories = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: `Category ${String.fromCharCode(65 + index)}`,
  patterns: [`category-${index + 1}`],
  hidden: false,
  windows: [],
}));

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/categories' && route.request().method() === 'GET') {
      await route.fulfill({ json: categories });
      return;
    }

    if (pathname.startsWith('/api/categories/')) {
      await route.fulfill({ json: { count: 0 } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

test('the category table takes only the space it needs and stripes its rows', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/categories', { waitUntil: 'networkidle' });
  const region = page.getByRole('region', { name: 'Category table' });
  await expect(region).toBeVisible();

  const tableWidth = await page.locator('table').evaluate((table) => table.getBoundingClientRect().width);
  const regionWidth = await region.evaluate((element) => element.getBoundingClientRect().width);
  expect(tableWidth).toBeLessThan(regionWidth);

  const colors = await page.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) => getComputedStyle(row).backgroundColor),
  );
  expect(colors.length).toBeGreaterThan(2);
  expect(colors[0]).not.toBe(colors[1]);
  expect(colors[1]).not.toBe(colors[2]);
  expect(colors[0]).toBe(colors[2]);
});

test('the category table centers cell values and row actions on one vertical axis', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/categories', { waitUntil: 'networkidle' });

  const row = page.locator('tbody tr').first();
  const valueCenter = await row.locator('td').first().evaluate((cell) => {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const { top, height } = range.getBoundingClientRect();
    return top + height / 2;
  });

  for (const name of ['Edit', 'Delete']) {
    const controlCenter = await row.getByRole('button', { name }).evaluate((control) => {
      const { top, height } = control.getBoundingClientRect();
      return top + height / 2;
    });
    expect(Math.abs(valueCenter - controlCenter)).toBeLessThanOrEqual(1);
  }
});

test('starting an edit scrolls the form into view with the category loaded', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/categories', { waitUntil: 'networkidle' });
  const form = page.locator('form');
  await expect(form).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(form).not.toBeInViewport();

  const lastRow = page.locator('tbody tr').last();
  const lastName = (await lastRow.locator('td').first().textContent())?.trim() ?? '';
  await lastRow.getByRole('button', { name: 'Edit' }).click();

  await expect(form).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Edit category' })).toBeVisible();
  await expect(form.locator('label input').first()).toHaveValue(lastName);
});

test('starting an edit brings the form into view with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await interceptApi(page);
  await page.goto('/categories', { waitUntil: 'networkidle' });
  const form = page.locator('form');
  await expect(form).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(form).not.toBeInViewport();

  await page.locator('tbody tr').last().getByRole('button', { name: 'Edit' }).click();

  await expect(form).toBeInViewport();
});

test('the form sends and the table shows the expense types', async ({ page }) => {
  const typedCategories = [
    { id: '1', name: 'Groceries', patterns: ['rewe'], hidden: false, windows: [], expenseType: 'recurring' },
    { id: '2', name: 'Internal', patterns: ['internal'], hidden: true, windows: [], expenseType: null },
    { id: '3', name: 'New car', patterns: ['dealer'], hidden: false, windows: [], expenseType: 'one-time' },
  ];
  let submitted: Record<string, unknown> | null = null;

  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: typedCategories });
      return;
    }

    if (pathname === '/api/categories' && method === 'POST') {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 201, json: { id: '4', ...submitted } });
      return;
    }

    if (pathname.startsWith('/api/categories/')) {
      await route.fulfill({ json: { count: 0 } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });

  await page.goto('/categories', { waitUntil: 'networkidle' });

  const types = await page.getByTestId('category-expense-type').allTextContents();
  expect(types).toEqual(['Recurring', 'Unset', 'One-time']);

  await page.locator('tbody tr').first().getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByTestId('expense-type-recurring')).toBeChecked();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.locator('form label input').first().fill('Utilities');
  await page.getByTestId('pattern-input').first().fill('power');
  await page.getByTestId('expense-type-one-time').check();
  await page.getByRole('button', { name: 'Add category' }).click();

  await expect.poll(() => submitted).not.toBeNull();
  expect(submitted).toMatchObject({ name: 'Utilities', patterns: ['power'], expenseType: 'one-time' });
});
