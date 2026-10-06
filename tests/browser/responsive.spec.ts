import { expect, test, type Page } from '@playwright/test';

const categories = Array.from({ length: 8 }, (_, index) => ({
  id: String(index + 1),
  name: index === 7 ? 'A deliberately long category name for narrow screens' : `Category ${index + 1}`,
  patterns: [`category-${index + 1}`],
  hidden: false,
  windows: [],
}));

const today = new Date().toISOString().slice(0, 10);
const transactions = [
  ...categories.map((category, index) => ({
    id: String(index + 1),
    bookingDate: today,
    valueDate: today,
    amount: `-${(index + 1) * 10}.00`,
    purpose: `A longer purpose description for ${category.name}`,
    counterpartyName: `Merchant ${index + 1}`,
    counterpartyAccount: `DE000000000000000${index + 1}`,
    category: { id: category.id, name: category.name, hidden: category.hidden },
  })),
  {
    id: 'uncategorised',
    bookingDate: today,
    valueDate: today,
    amount: '-3.25',
    purpose: 'Uncategorised transaction',
    counterpartyName: 'Local shop',
    counterpartyAccount: null,
    category: null,
  },
];

const importRuns = [
  {
    id: '1',
    startedAt: '2026-10-06T03:00:00Z',
    finishedAt: '2026-10-06T03:00:05Z',
    source: 'scheduled',
    nonWriting: true,
    outcome: 'success',
    rowsRead: 12,
    rowsAlreadyStored: 12,
    rowsWritten: 0,
    error: null,
  },
];

const routes = [
  { path: '/', heading: 'Transactions' },
  { path: '/categories', heading: 'Categories' },
  { path: '/analytics', heading: 'Category spending' },
  { path: '/monthly-totals', heading: 'Monthly totals' },
  { path: '/monthly-average', heading: 'Monthly average' },
  { path: '/imports', heading: 'Imports' },
  { path: '/route-that-does-not-exist', heading: 'This page does not exist' },
];

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/api/transactions') {
      await route.fulfill({ json: transactions });
      return;
    }

    if (pathname === '/api/imports') {
      await route.fulfill({ json: importRuns });
      return;
    }

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

async function expectNoPageOverflow(page: Page): Promise<void> {
  await page.mouse.move(1, 1);
  await page.mouse.wheel(1000, 0);
  expect(await page.evaluate(() => window.scrollX), 'horizontal gestures on the page should not scroll it').toBe(0);
}

async function expectPhoneControlsToBeTouchSized(page: Page): Promise<void> {
  const shortControls = await page.locator(
    'button:visible, select:visible, input:not([type="checkbox"]):visible, #screen-navigation a:visible',
  ).evaluateAll((elements) => elements
    .filter((element) => element.getBoundingClientRect().height < 44)
    .map((element) => ({
      element: element.tagName,
      label: (element.textContent ?? '').trim(),
      height: element.getBoundingClientRect().height,
    })));
  expect(shortControls).toEqual([]);

  const shortCheckboxLabels = await page.locator('input[type="checkbox"]:visible').evaluateAll((elements) =>
    elements.filter((element) => {
      const label = element.closest('label');
      return label === null || label.getBoundingClientRect().height < 44;
    }).length,
  );
  expect(shortCheckboxLabels).toBe(0);
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`${route.path} fits without page-level horizontal overflow`, async ({ page }) => {
        await interceptApi(page);
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
        await expectNoPageOverflow(page);

        if (viewport.width <= 390) {
          await expectPhoneControlsToBeTouchSized(page);
        }

        if (viewport.width <= 390 && route.path === '/') {
          const region = page.getByRole('region', { name: 'Transactions table' });
          await expect(region).toBeVisible();
          await region.focus();
          await page.keyboard.press('ArrowRight');
          await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
          await expectNoPageOverflow(page);
        }

        if (viewport.width <= 390 && route.path === '/categories') {
          await page.getByTestId('add-window').click();
          await expect(page.getByTestId('window-from')).toBeVisible();
          await expectPhoneControlsToBeTouchSized(page);

          const region = page.getByRole('region', { name: 'Category table' });
          await expect(region).toBeVisible();
          await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
            .toBe(true);
          await expectNoPageOverflow(page);
        }

        if (viewport.width <= 390 && route.path === '/monthly-totals') {
          const region = page.getByRole('region', { name: 'Monthly category totals table' });
          await expect(region).toBeVisible();
          await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
            .toBe(true);
          await expectNoPageOverflow(page);
        }

        if (route.path === '/analytics') {
          await expect(page.getByTestId('month-panel')).toHaveCount(12);
          if (viewport.width <= 390) {
            await expect(page.getByTestId('monthly-charts')).toHaveCSS('grid-template-columns', /\d+px$/);
          }
        }

        if (route.path === '/imports') {
          await expect(page.getByTestId('import-run')).toHaveCount(1);
          await expect(page.getByTestId('import-run-mode')).toHaveText('Non-writing');
          await expect(page.getByTestId('import-run-outcome')).toHaveText('Success');
        }
      });
    }

    if (viewport.width <= 390) {
      test('mobile navigation toggles and closes after selecting a screen', async ({ page }) => {
        await interceptApi(page);
        await page.goto('/');
        const toggle = page.getByTestId('mobile-navigation-toggle');

        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#screen-navigation a')).toHaveCount(6);
        await expectPhoneControlsToBeTouchSized(page);
        await page.getByRole('link', { name: 'Categories' }).click();
        await expect(page).toHaveURL(/\/categories$/);
        await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#screen-navigation a[aria-current="page"]')).toHaveText('Categories');
      });
    } else {
      test('wide navigation keeps all destinations directly visible', async ({ page }) => {
        await interceptApi(page);
        await page.goto('/');
        const links = page.locator('#screen-navigation a');
        await expect(links).toHaveCount(6);
        await expect(links.first()).toBeVisible();
        await expect(links.last()).toBeVisible();
      });
    }
  });
}
