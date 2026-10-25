import { expect, test, type Page } from '@playwright/test';

// The redesigned Transactions screen: the brand bar, the title-summary-sheet
// order, the category pills, the amount-last columns, and the responsive
// behaviour of the same screen. The API is intercepted, so the checklist runs
// against fixed data without touching stored transactions.
//
// See openspec/changes/redesign-transactions-screen/specs/frontend-shell/spec.md
// and openspec/changes/redesign-transactions-screen/specs/transaction-table/spec.md

const currentYear = new Date().getFullYear();

const categories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
  { id: '2', name: 'Transport', patterns: ['transit'], hidden: false, windows: [] },
];

const transactions = [
  {
    id: 'categorised',
    bookingDate: `${currentYear}-02-10`,
    valueDate: `${currentYear}-02-10`,
    amount: '-12.50',
    purpose: 'Weekly shop',
    counterpartyName: 'Market',
    counterpartyAccount: 'AT001',
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: 'transport',
    bookingDate: `${currentYear}-02-11`,
    valueDate: `${currentYear}-02-11`,
    amount: '-31.65',
    purpose: 'Transit pass',
    counterpartyName: 'Rail',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '2', name: 'Transport', hidden: false },
  },
  {
    id: 'uncategorised',
    bookingDate: `${currentYear}-02-12`,
    valueDate: `${currentYear}-02-12`,
    amount: '-3.25',
    purpose: 'Local shop',
    counterpartyName: 'Corner shop',
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: null,
  },
];

async function interceptApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/transactions' && method === 'GET') {
      await route.fulfill({ json: transactions });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: categories });
      return;
    }

    if (pathname === '/api/transactions/category-assignments' && method === 'POST') {
      await route.fulfill({ json: {} });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function openWithAllCategories(page: Page): Promise<void> {
  await interceptApi(page);
  await page.goto('/?category=all', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('visible-count')).toHaveText('3 transactions');
}

test.describe('redesigned transactions screen', () => {
  test.use({ viewport: { width: 1720, height: 1200 } });

  test('presents the brand bar, summary, sheets, pills, and amount-last table', async ({ page }) => {
    await openWithAllCategories(page);

    const header = page.locator('header');
    await expect(header.getByText('Expenses', { exact: true })).toBeVisible();
    const headerBackground = await header.evaluate((element) => window.getComputedStyle(element).backgroundImage);
    expect(headerBackground).toContain('linear-gradient');

    const links = page.locator('#screen-navigation a');
    await expect(links).toHaveCount(7);
    await expect(links).toHaveText([
      'Transactions',
      'Categories',
      'People',
      'Analytics',
      'Monthly totals',
      'Monthly average',
      'Imports',
    ]);

    const active = page.locator('#screen-navigation a[aria-current="page"]');
    const inactive = page.locator('#screen-navigation a:not([aria-current])').first();
    const pillStyles = await page.evaluate(() => {
      const activeLink = document.querySelector('#screen-navigation a[aria-current="page"]') as HTMLElement;
      const inactiveLink = document.querySelector('#screen-navigation a:not([aria-current])') as HTMLElement;
      return {
        activeBackground: window.getComputedStyle(activeLink).backgroundColor,
        inactiveBackground: window.getComputedStyle(inactiveLink).backgroundColor,
        activeRadius: window.getComputedStyle(activeLink).borderRadius,
      };
    });
    await expect(active).toHaveText('Transactions');
    expect(pillStyles.activeBackground).toBe('rgb(255, 255, 255)');
    expect(pillStyles.activeBackground).not.toBe(pillStyles.inactiveBackground);
    expect(Number.parseFloat(pillStyles.activeRadius)).toBeGreaterThanOrEqual(9999);

    const focusStyle = await page.locator('#screen-navigation a').nth(1).evaluate((element) => {
      (element as HTMLElement).focus();
      const style = window.getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineWidth).toBeGreaterThan(0);

    await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
    const summary = page.getByTestId('visible-total');
    await expect(summary).toContainText('3 transactions');
    await expect(summary).not.toContainText(/income|spending/i);

    const order = await page.evaluate(() => {
      const heading = document.querySelector('h1') as HTMLElement;
      const summaryElement = document.querySelector('[data-testid="visible-total"]') as HTMLElement;
      const search = document.querySelector('[data-testid="transaction-search"]') as HTMLElement;
      const table = document.querySelector('[data-testid="transactions-scroll"]') as HTMLElement;
      return {
        headingBeforeSummary: Boolean(
          heading.compareDocumentPosition(summaryElement) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        summaryBeforeSearch: Boolean(
          summaryElement.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        searchBeforeTable: Boolean(
          search.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      };
    });
    expect(order).toEqual({
      headingBeforeSummary: true,
      summaryBeforeSearch: true,
      searchBeforeTable: true,
    });

    const sheetStyles = await page.evaluate(() => {
      const filterInput = document.querySelector('[data-testid="transaction-search"]') as HTMLElement;
      const tableRegion = document.querySelector('[data-testid="transactions-scroll"]') as HTMLElement;
      const filterSheet = filterInput.parentElement?.closest('.rounded-sheet') as HTMLElement;
      const tableSheet = tableRegion.closest('.rounded-sheet') as HTMLElement;
      return {
        filterBackground: window.getComputedStyle(filterSheet).backgroundColor,
        filterRadius: window.getComputedStyle(filterSheet).borderRadius,
        tableBackground: window.getComputedStyle(tableSheet).backgroundColor,
        tableRadius: window.getComputedStyle(tableSheet).borderRadius,
      };
    });
    expect(sheetStyles.filterBackground).toBe('rgb(255, 255, 255)');
    expect(sheetStyles.tableBackground).toBe('rgb(255, 255, 255)');
    expect(sheetStyles.filterRadius).toBe('14px');
    expect(sheetStyles.tableRadius).toBe('14px');

    const headers = page.locator('thead th');
    await expect(headers).toHaveCount(9);
    await expect(headers.last()).toHaveText('Amount');
    const amountCell = page.locator('[data-transaction-id="categorised"] td').last();
    await expect(amountCell).toHaveText('-12.50');
    expect(await amountCell.evaluate((element) => window.getComputedStyle(element).textAlign)).toBe('right');
    await expect(page.locator('tbody tr').first().locator('td').first().locator('input[type="checkbox"]'))
      .toHaveCount(1);

    const pills = await page.evaluate(() => {
      const categorised = document.querySelector(
        '[data-transaction-id="categorised"] [data-testid="row-category-select"]',
      ) as HTMLElement;
      const uncategorised = document.querySelector(
        '[data-transaction-id="uncategorised"] [data-testid="row-category-select"]',
      ) as HTMLElement;
      return {
        categorisedBackground: window.getComputedStyle(categorised).backgroundColor,
        categorisedColor: window.getComputedStyle(categorised).color,
        categorisedRadius: window.getComputedStyle(categorised).borderRadius,
        uncategorisedBackground: window.getComputedStyle(uncategorised).backgroundColor,
        uncategorisedText: (uncategorised as HTMLSelectElement).selectedOptions[0]?.text ?? '',
      };
    });
    expect(pills.categorisedBackground).not.toBe(pills.uncategorisedBackground);
    expect(pills.categorisedBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(pills.categorisedColor).not.toBe('');
    expect(Number.parseFloat(pills.categorisedRadius)).toBeGreaterThanOrEqual(9999);
    expect(pills.uncategorisedBackground).toBe('rgb(255, 255, 255)');
    expect(pills.uncategorisedText).toBe('Uncategorised');

    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('transactions-batch-sentinel')).toHaveCount(1);
  });

  test('keeps the category pill operable as the assignment control', async ({ page }) => {
    await openWithAllCategories(page);

    const pill = page.locator('[data-transaction-id="uncategorised"] [data-testid="row-category-select"]');
    await expect(pill).toBeEnabled();
    await expect(pill.locator('option')).toHaveText([
      'Uncategorised',
      'Groceries',
      'Transport',
    ]);

    const request = page.waitForRequest((candidate) =>
      new URL(candidate.url()).pathname === '/api/transactions/category-assignments');
    await pill.selectOption('1');
    const assignment = await request;
    expect(assignment.method()).toBe('POST');
    expect(assignment.postDataJSON()).toEqual({
      transactionIds: ['uncategorised'],
      categoryId: '1',
    });
  });

  for (const viewport of [
    { width: 320, height: 640 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1720, height: 1200 },
  ]) {
    test(`fits the redesigned screen at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openWithAllCategories(page);

      if (viewport.width < 768) {
        const toggle = page.getByTestId('mobile-navigation-toggle');
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      }

      await expect(page.locator('#screen-navigation a')).toHaveCount(7);
      const navigationLinks = page.locator('#screen-navigation a:visible');
      await expect(navigationLinks).toHaveCount(7);

      await page.mouse.move(1, 1);
      await page.mouse.wheel(1000, 0);
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
      expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
      const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > window.innerWidth + 1
            && element.closest('[data-testid="transactions-scroll"]') === null
            && window.getComputedStyle(element).position !== 'fixed';
        })
        .map((element) => `${element.tagName}.${(element as HTMLElement).className}`));
      expect(offenders).toEqual([]);

      const tableRegion = page.getByTestId('transactions-scroll');
      expect(await tableRegion.evaluate((element) => element.scrollWidth > element.clientWidth))
        .toBe(viewport.width < 1024);

      if (viewport.width <= 390) {
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
        const pillHeight = await page.locator('[data-testid="row-category-select"]').first()
          .evaluate((element) => element.getBoundingClientRect().height);
        expect(pillHeight).toBeGreaterThanOrEqual(44);
      }
    });
  }
});
