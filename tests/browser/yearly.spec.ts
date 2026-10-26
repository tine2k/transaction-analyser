import { expect, test, type Locator, type Page } from '@playwright/test';
import { contrastRatio } from './contrast';

// The Yearly screen: one selected year as a category-by-month matrix, its two
// summary cards, the retained filters, and the cell links. The API is
// intercepted, so these checks exercise the rendered output rather than live
// transaction data.
//
// See openspec/changes/replace-monthly-totals-with-yearly-screen/specs/monthly-category-totals-table/spec.md
// and openspec/changes/align-yearly-table-links/specs/monthly-category-totals-table/spec.md

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

async function verticalCenter(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    if (rect.height > 0) {
      return rect.top + rect.height / 2;
    }
    const own = element.getBoundingClientRect();
    return own.top + own.height / 2;
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

test('a populated month link fills its cell and hovers at the cell edge', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  const cell = page
    .getByTestId('yearly-month-cell')
    .filter({ has: page.getByTestId('yearly-month-link') })
    .first();
  const link = cell.getByTestId('yearly-month-link');

  const cellBox = await cell.boundingBox();
  const linkBox = await link.boundingBox();
  expect(cellBox).not.toBeNull();
  expect(linkBox).not.toBeNull();

  const cellContentBox = await cell.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));

  expect(Math.round(linkBox!.height)).toBe(cellContentBox.height);
  expect(Math.round(linkBox!.width)).toBe(cellContentBox.width);

  const backgroundBefore = await link.evaluate((element) => getComputedStyle(element).backgroundColor);

  // The cell's lower edge is outside the amount text but must still belong to the link.
  await page.mouse.move(
    cellBox!.x + cellBox!.width / 2,
    cellBox!.y + cellContentBox.height - 1,
  );

  await expect.poll(() => link.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(backgroundBefore);
  expect(await link.evaluate((element) => element.matches(':hover'))).toBe(true);
});

test('the yearly matrix centers its labels, month links, and total link on one vertical axis', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  const row = page.getByTestId('yearly-row').filter({ hasText: 'Groceries' });

  async function expectOneVerticalAxis(): Promise<void> {
    const monthCenter = await verticalCenter(row.getByTestId('yearly-month-link').first());
    const centers = [
      await verticalCenter(row.locator('th span').last()),
      monthCenter,
      await verticalCenter(row.locator('[data-month-key="2025-04"] span')),
      await verticalCenter(row.getByTestId('yearly-total-link')),
    ];

    for (const center of centers) {
      expect(Math.abs(center - monthCenter)).toBeLessThanOrEqual(1);
    }

    const heights = await row
      .locator('[data-testid="yearly-month-link"], [data-testid="yearly-total-link"]')
      .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(heights.length).toBeGreaterThan(0);
    expect(heights.every((height) => height >= 44)).toBe(true);
  }

  await expectOneVerticalAxis();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectOneVerticalAxis();
});

test('every yearly category dot clears 3:1 against the matrix surface', async ({ page }) => {
  await interceptTransactions(page);
  await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

  const dots = await page.locator('[data-testid="category-color"]').evaluateAll((elements) => {
    const matrix = document.querySelector('[data-testid="yearly-matrix-scroll"]') as HTMLElement;
    const surface = window.getComputedStyle(matrix).backgroundColor;
    return elements.map((element) => ({
      colour: window.getComputedStyle(element).backgroundColor,
      surface,
    }));
  });

  expect(dots.length).toBeGreaterThan(0);
  for (const dot of dots) {
    expect(contrastRatio(dot.colour, dot.surface)).toBeGreaterThanOrEqual(3);
  }
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

for (const width of [320, 390]) {
  test(`a ${width}px phone pins Category and keeps every month reachable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await interceptTransactions(page);
    await page.goto('/yearly?year=2025', { waitUntil: 'networkidle' });

    const table = page.getByTestId('yearly-matrix');
    const headers = table.locator('thead th');
    await expect(headers).toHaveCount(14);
    expect(await table.locator('thead th .sr-only').allTextContents()).toEqual([
      'January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025',
      'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025',
    ]);
    expect(await table.locator('thead th span[aria-hidden="true"]').allTextContents()).toEqual([
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]);

    const region = page.getByTestId('yearly-matrix-scroll');
    await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
      .toBe(true);
    await region.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });

    const firstRow = page.getByTestId('yearly-row').first();
    const categoryCell = firstRow.locator('th');
    await expect.poll(async () => {
      const regionBox = await region.boundingBox();
      const categoryBox = await categoryCell.boundingBox();
      return regionBox === null || categoryBox === null
        ? Number.POSITIVE_INFINITY
        : Math.abs(categoryBox.x - regionBox.x);
    }).toBeLessThanOrEqual(2);

    await expect(firstRow.locator('[data-month-key="2025-12"]')).toBeVisible();
    await expect(firstRow.getByTestId('yearly-total-cell')).toBeVisible();

    const groceries = page.getByTestId('yearly-row').filter({ hasText: 'Groceries' });
    const january = groceries.locator('[data-month-key="2025-01"]');
    await expect(january.getByTestId('yearly-month-link')).toHaveAttribute('href', /month=2025-01/);
    await expect(january.getByTestId('yearly-month-link')).toHaveAttribute('href', /category=1/);
    expect(await january.getAttribute('style')).toContain('--yearly-tint');

    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  });
}

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
