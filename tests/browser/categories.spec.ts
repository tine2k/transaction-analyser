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
