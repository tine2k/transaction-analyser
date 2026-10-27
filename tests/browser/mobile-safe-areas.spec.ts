import { expect, test, type Page } from '@playwright/test';

// The installed-app layout: the same frame, but with simulated phone safe-area
// insets. The custom properties are the test seam described in design.md D5;
// production leaves them unset so env() supplies the device values.

const currentYear = new Date().getFullYear();

const categories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
];

const transactions = [
  {
    id: 'one',
    bookingDate: `${currentYear}-02-10`,
    valueDate: `${currentYear}-02-11`,
    amount: '-12.50',
    purpose: 'Weekly shop',
    counterpartyName: 'Market',
    counterpartyAccount: 'AT001',
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: { id: '1', name: 'Groceries', hidden: false },
  },
  {
    id: 'two',
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

const simulatedInsets = [
  ':root {',
  '  --safe-area-top: 47px;',
  '  --safe-area-left: 47px;',
  '  --safe-area-right: 47px;',
  '  --safe-area-bottom: 34px;',
  '}',
].join('\n');

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

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function openPhone(page: Page, inset: boolean): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await interceptApi(page);
  await page.goto('/?category=all', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('transaction-card').first()).toBeVisible();
  if (inset) {
    await page.addStyleTag({ content: simulatedInsets });
  }
}

async function frameMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header') as HTMLElement;
    const headerInner = header.firstElementChild as HTMLElement;
    const wordmark = header.querySelector('p') as HTMLElement;
    const main = document.querySelector('main') as HTMLElement;
    const pageRoot = main.firstElementChild as HTMLElement;

    return {
      headerTop: header.getBoundingClientRect().top,
      headerPaddingTop: Number.parseFloat(window.getComputedStyle(header).paddingTop),
      headerBackground: window.getComputedStyle(header).backgroundImage,
      wordmarkTop: wordmark.getBoundingClientRect().top,
      headerPaddingLeft: Number.parseFloat(window.getComputedStyle(headerInner).paddingLeft),
      headerPaddingRight: Number.parseFloat(window.getComputedStyle(headerInner).paddingRight),
      mainPaddingLeft: Number.parseFloat(window.getComputedStyle(main).paddingLeft),
      mainPaddingRight: Number.parseFloat(window.getComputedStyle(main).paddingRight),
      mainPaddingBottom: Number.parseFloat(window.getComputedStyle(main).paddingBottom),
      pageRootPaddingBottom: Number.parseFloat(window.getComputedStyle(pageRoot).paddingBottom),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

test.describe('installed phone safe areas', () => {
  test('paints the header through the top inset and clears the side and bottom insets', async ({ page }) => {
    await openPhone(page, true);

    const frame = await frameMetrics(page);
    expect(frame.headerTop).toBe(0);
    expect(frame.headerPaddingTop).toBe(47);
    expect(frame.headerBackground).toContain('linear-gradient');
    expect(frame.wordmarkTop).toBeGreaterThanOrEqual(47);
    expect(frame.headerPaddingLeft).toBe(47);
    expect(frame.headerPaddingRight).toBe(47);
    expect(frame.mainPaddingLeft).toBe(47);
    expect(frame.mainPaddingRight).toBe(47);
    expect(frame.mainPaddingBottom).toBe(34);
    expect(frame.scrollWidth).toBeLessThanOrEqual(frame.viewportWidth);

    await page.getByTestId('row-select').first().check();
    await expect(page.getByTestId('bulk-assignment-bar')).toBeVisible();

    const bar = page.getByTestId('bulk-assignment-bar');
    const barMetrics = await bar.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const controls = Array.from(element.querySelectorAll('select, button'))
        .map((control) => control.getBoundingClientRect().bottom);
      return {
        bottom: element.getBoundingClientRect().bottom,
        paddingBottom: Number.parseFloat(style.paddingBottom),
        background: style.backgroundColor,
        lowestControlBottom: Math.max(...controls),
      };
    });

    expect(barMetrics.bottom).toBeCloseTo(844, 0);
    expect(barMetrics.paddingBottom).toBe(46);
    expect(barMetrics.background).toBe('rgb(255, 255, 255)');
    expect(barMetrics.lowestControlBottom).toBeLessThanOrEqual(844 - 34);
    expect((await frameMetrics(page)).pageRootPaddingBottom).toBe(146);

    await page.evaluate(() => {
      const field = document.querySelector(
        '[data-transaction-id="one"] [data-transaction-field="purpose"]',
      ) as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(field);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    await expect(page.getByTestId('pattern-shortcut-bar')).toBeVisible();
    expect((await frameMetrics(page)).pageRootPaddingBottom).toBe(258);

    await page.setViewportSize({ width: 844, height: 390 });
    const landscape = await frameMetrics(page);
    expect(landscape.headerPaddingLeft).toBe(47);
    expect(landscape.headerPaddingRight).toBe(47);
    expect(landscape.mainPaddingLeft).toBe(47);
    expect(landscape.mainPaddingRight).toBe(47);
    expect(landscape.scrollWidth).toBeLessThanOrEqual(landscape.viewportWidth);
  });

  test('keeps the browser-tab frame metrics when no inset is present', async ({ page }) => {
    await openPhone(page, false);

    const frame = await frameMetrics(page);
    expect(frame.headerPaddingTop).toBe(0);
    expect(frame.headerPaddingLeft).toBe(16);
    expect(frame.headerPaddingRight).toBe(16);
    expect(frame.mainPaddingLeft).toBe(16);
    expect(frame.mainPaddingRight).toBe(16);
    expect(frame.mainPaddingBottom).toBe(32);
    expect(frame.pageRootPaddingBottom).toBe(0);
    expect(frame.scrollWidth).toBeLessThanOrEqual(frame.viewportWidth);

    await page.getByTestId('row-select').first().check();
    await expect(page.getByTestId('bulk-assignment-bar')).toBeVisible();
    expect((await frameMetrics(page)).pageRootPaddingBottom).toBe(112);

    const barMetrics = await page.getByTestId('bulk-assignment-bar').evaluate((element) => ({
      paddingBottom: Number.parseFloat(window.getComputedStyle(element).paddingBottom),
    }));
    expect(barMetrics.paddingBottom).toBe(12);
  });
});
