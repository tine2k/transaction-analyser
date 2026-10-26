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
    person: { id: String((index % 2) + 1), name: index % 2 === 0 ? 'Default' : 'Anna' },
    categoryAssignment: 'automatic',
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
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: null,
  },
];

const importRuns = [
  {
    id: '1',
    startedAt: '2026-10-06T03:00:00Z',
    finishedAt: '2026-10-06T03:00:05Z',
    source: 'scheduled',
    person: { id: '1', name: 'Default' },
    nonWriting: true,
    outcome: 'success',
    rowsRead: 12,
    rowsAlreadyStored: 12,
    rowsWritten: 0,
    rowsCategorised: 0,
    error: null,
  },
];

const people = [
  { id: '1', name: 'Default', transactionCount: 4 },
  { id: '2', name: 'Anna', transactionCount: 0 },
];

const routes = [
  { path: '/', heading: 'Transactions' },
  { path: '/categories', heading: 'Categories' },
  { path: '/people', heading: 'People' },
  { path: '/monthly', heading: 'Monthly' },
  { path: '/yearly', heading: 'Yearly' },
  { path: '/monthly-average', heading: 'Monthly average' },
  { path: '/imports', heading: 'Imports' },
  { path: '/manage', heading: 'Manage' },
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

    if (pathname === '/api/people') {
      await route.fulfill({ json: people });
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
    'button:visible, select:visible, input:not([type="checkbox"]):visible, #screen-navigation a:visible, [data-testid="manage-categories-link"]:visible',
  ).evaluateAll((elements) => elements
    .filter((element) => {
      const target = element.matches('[data-testid="row-category-select"]')
        ? element.closest('label') ?? element
        : element;
      return target.getBoundingClientRect().height < 44;
    })
    .map((element) => {
      const target = element.matches('[data-testid="row-category-select"]')
        ? element.closest('label') ?? element
        : element;
      return {
        element: element.tagName,
        label: (element.textContent ?? '').trim(),
        height: target.getBoundingClientRect().height,
      };
    }));
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

        if (route.path === '/') {
          await expect(page.getByTestId('person-filter')).toBeVisible();
          await expect(page.getByTestId('category-filter')).toBeVisible();
          await expect(page.getByTestId('period-filter')).toBeVisible();

          if (viewport.width <= 390) {
            await expect(page.getByTestId('transaction-card')).toHaveCount(1);
            await expect(page.getByTestId('transactions-scroll')).toHaveCount(0);
            const card = page.getByTestId('transaction-card').first();
            await expect(card).toContainText('Uncategorised transaction');
            await expect(card).toContainText('-3.25');
            await expect(card).toContainText('Local shop');
            await expect(card).toContainText('Default');
            await expect(card).toContainText('No counterparty account');
            await expectNoPageOverflow(page);
          } else {
            const region = page.getByRole('region', { name: 'Transactions table' });
            await expect(region).toBeVisible();
            await expect(page.getByTestId('transaction-card')).toHaveCount(0);
          }
        }

        if (viewport.width <= 390 && route.path === '/categories') {          await page.getByTestId('add-window').click();
          await expect(page.getByTestId('window-from')).toBeVisible();
          await expectPhoneControlsToBeTouchSized(page);

          const region = page.getByRole('region', { name: 'Category table' });
          await expect(region).toBeVisible();
          await expect(page.locator('thead th')).toHaveCount(6);
          await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
            .toBe(true);

          const firstRow = page.locator('tbody tr').first();
          const nameCell = firstRow.locator('td').first();
          const actionsCell = firstRow.locator('td').last();
          await region.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
          });
          await expect.poll(async () => {
            const regionBox = await region.boundingBox();
            const nameBox = await nameCell.boundingBox();
            return regionBox === null || nameBox === null
              ? Number.POSITIVE_INFINITY
              : Math.abs(nameBox.x - regionBox.x);
          }).toBeLessThanOrEqual(2);
          await expect.poll(async () => {
            const regionBox = await region.boundingBox();
            const actionsBox = await actionsCell.boundingBox();
            return regionBox === null || actionsBox === null
              ? Number.POSITIVE_INFINITY
              : Math.abs((actionsBox.x + actionsBox.width) - (regionBox.x + regionBox.width));
          }).toBeLessThanOrEqual(3);

          for (const action of ['Edit', 'Delete']) {
            const control = firstRow.getByRole('button', { name: new RegExp(`^${action} `) });
            const box = await control.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.width).toBeGreaterThanOrEqual(44);
            expect(box!.height).toBeGreaterThanOrEqual(44);
          }
          await expect(page.getByText('A deliberately long category name for narrow screens', { exact: true })).toBeVisible();
          await expectNoPageOverflow(page);
        }

        if (viewport.width <= 390 && route.path === '/people') {
          await expect(page.getByTestId('person-row')).toHaveCount(2);
          await expect(page.getByTestId('person-name-input')).toBeVisible();
          await expectPhoneControlsToBeTouchSized(page);

          const region = page.getByRole('region', { name: 'People table' });
          await expect(region).toBeVisible();
          await expectNoPageOverflow(page);
        }

        if (viewport.width <= 390 && route.path === '/yearly') {
          await expect(page.getByTestId('year-pill')).toHaveCount(1);
          await expect(page.getByTestId('yearly-row')).toHaveCount(9);
          const region = page.getByRole('region', { name: 'Yearly category matrix' });
          await expect(region).toBeVisible();
          await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
            .toBe(true);

          const table = page.getByTestId('yearly-matrix');
          await expect(table.locator('thead th')).toHaveCount(14);
          expect(await table.locator('thead th .sr-only').allTextContents()).toEqual([
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ].map((month) => `${month} ${new Date().getFullYear()}`));

          await region.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
          });
          const firstRow = page.getByTestId('yearly-row').first();
          await expect(firstRow.locator('[data-month-key^="' + new Date().getFullYear() + '-12"]')).toBeVisible();
          await expect(firstRow.getByTestId('yearly-total-cell')).toBeVisible();
          await expect.poll(async () => {
            const regionBox = await region.boundingBox();
            const categoryBox = await firstRow.locator('th').boundingBox();
            return regionBox === null || categoryBox === null
              ? Number.POSITIVE_INFINITY
              : Math.abs(categoryBox.x - regionBox.x);
          }).toBeLessThanOrEqual(2);

          await expectNoPageOverflow(page);
        }

        if (route.path === '/monthly') {
          await expect(page.getByTestId('monthly-summary')).toBeVisible();
          await expect(page.getByTestId('month-pill')).toHaveCount(12);
          await expect(page.getByTestId('category-bar')).toBeVisible();
          await expect(page.getByTestId('category-row')).toHaveCount(9);

          if (viewport.width <= 390) {
            const region = page.getByRole('region', { name: 'Monthly category table' });
            await expect(region).toBeVisible();

            const headers = await page.getByTestId('monthly-category-table').locator('thead th').allTextContents();
            expect(headers.map((header) => header.trim()))
              .toEqual(['Category', 'Amount', 'Share of top category', 'Transactions']);

            const regionBox = await region.boundingBox();
            const categoryBox = await page.getByTestId('category-row').first().locator('th').boundingBox();
            const amountBox = await page.getByTestId('category-row').first().getByTestId('row-amount').boundingBox();
            expect(regionBox).not.toBeNull();
            expect(categoryBox).not.toBeNull();
            expect(amountBox).not.toBeNull();
            expect(amountBox!.x).toBeGreaterThanOrEqual(categoryBox!.x + categoryBox!.width - 1);
            expect(amountBox!.x + amountBox!.width).toBeLessThanOrEqual(regionBox!.x + regionBox!.width + 1);

            if (viewport.width === 320) {
              await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
                .toBe(true);
            }
            await expectNoPageOverflow(page);
          }
        }

        if (route.path === '/monthly-average') {
          await expect(page.getByTestId('monthly-average-subtitle')).toContainText('12 months');
          await expect(page.getByTestId('monthly-average-filter-panel')).toBeVisible();
          await expect(page.getByTestId('monthly-average-summary-card')).toHaveCount(3);

          if (viewport.width <= 390) {
            await expect(page.getByTestId('monthly-average-table')).toHaveCount(0);
            await expect(page.getByTestId('category-average')).toHaveCount(0);
            await expect(page.getByTestId('category-average-card')).toHaveCount(9);
            await expect(page.getByTestId('monthly-average-sort-statement')).toBeVisible();
            const firstCard = page.getByTestId('category-average-card').first();
            await expect(firstCard.getByTestId('trend-bar')).toHaveCount(12);
            await expect(firstCard.getByTestId('category-window-total')).toBeVisible();
            await expect(firstCard.getByTestId('category-average-amount')).toBeVisible();
          } else {
            await expect(page.getByTestId('category-average-card')).toHaveCount(0);
            await expect(page.getByTestId('category-average')).toHaveCount(9);
            await expect(page.getByTestId('category-average').first().getByTestId('trend-bar')).toHaveCount(12);

            const region = page.getByRole('region', { name: 'Monthly average category table' });
            await expect(region).toBeVisible();

            if (viewport.width === 768) {
              await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
                .toBe(true);
            } else {
              await expect.poll(() => region.evaluate((element) => element.scrollWidth <= element.clientWidth))
                .toBe(true);
            }
          }
          await expectNoPageOverflow(page);
        }

        if (route.path === '/imports') {
          await expect(page.getByTestId('import-run')).toHaveCount(1);
          await expect(page.getByTestId('import-run-outcome')).toHaveText('Success');

          if (viewport.width <= 390) {
            await expect(page.locator('thead th')).toHaveCount(5);
            await expect(page.getByTestId('import-run-mode')).toHaveCount(0);
            await expect(page.getByTestId('import-run-disclosure')).toBeVisible();
          } else {
            await expect(page.locator('thead th')).toHaveCount(10);
            await expect(page.getByTestId('import-run-disclosure')).toHaveCount(0);
            await expect(page.getByTestId('import-run-mode')).toHaveText('Non-writing');
          }
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
        await expect(page.locator('#screen-navigation a')).toHaveCount(5);
        await expectPhoneControlsToBeTouchSized(page);
        await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Manage', exact: true }).click();
        await expect(page).toHaveURL(/\/manage$/);
        await expect(page.getByRole('heading', { name: 'Manage' })).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#screen-navigation a[aria-current="page"]')).toHaveText('Manage');
        await page.getByTestId('manage-link-categories').click();
        await expect(page).toHaveURL(/\/categories$/);
        await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
        await expect(page.locator('#screen-navigation a[aria-current="true"]')).toHaveText('Manage');
      });
    } else {
      test('wide navigation keeps all destinations directly visible', async ({ page }) => {
        await interceptApi(page);
        await page.goto('/');
        const links = page.locator('#screen-navigation a');
        await expect(links).toHaveCount(5);
        await expect(links.first()).toBeVisible();
        await expect(links.last()).toBeVisible();
      });
    }
  });
}

test.describe('phone table scroll affordance', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('the Monthly shell marks the edge with more content and contains the gesture', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/monthly', { waitUntil: 'networkidle' });

    const region = page.getByTestId('monthly-category-scroll');
    const shell = region.locator('..');
    await expect(shell).toHaveAttribute('data-overflow-start', 'false');
    await expect(shell).toHaveAttribute('data-overflow-end', 'true');

    await region.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(shell).toHaveAttribute('data-overflow-start', 'true');
    await expect(shell).toHaveAttribute('data-overflow-end', 'false');

    await region.evaluate((element) => {
      element.scrollLeft = 0;
    });
    await expect(shell).toHaveAttribute('data-overflow-start', 'false');
    await expect(shell).toHaveAttribute('data-overflow-end', 'true');

    await expectNoPageOverflow(page);
  });
});
