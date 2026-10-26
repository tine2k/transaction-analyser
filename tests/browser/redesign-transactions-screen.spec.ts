import { expect, test, type Page } from '@playwright/test';
import { contrastRatio } from './contrast';

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

async function interceptApi(
  page: Page,
  transactionRows = transactions,
  categoryRows = categories,
): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/transactions' && method === 'GET') {
      await route.fulfill({ json: transactionRows });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: categoryRows });
      return;
    }

    if (pathname === '/api/people' && method === 'GET') {
      await route.fulfill({ json: [] });
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

  test('matches the mock masthead and frame metrics', async ({ page }) => {
    await openWithAllCategories(page);

    const desktop = await page.evaluate(() => {
      const wordmark = document.querySelector('header p') as HTMLElement;
      const headerBox = document.querySelector('header > div') as HTMLElement;
      const headerInner = headerBox.firstElementChild as HTMLElement;
      const link = document.querySelector('#screen-navigation a') as HTMLElement;
      const main = document.querySelector('main') as HTMLElement;
      return {
        wordmarkSize: window.getComputedStyle(wordmark).fontSize,
        wordmarkWeight: window.getComputedStyle(wordmark).fontWeight,
        wordmarkSpacing: Number.parseFloat(window.getComputedStyle(wordmark).letterSpacing),
        headerTop: Number.parseFloat(window.getComputedStyle(headerBox).paddingTop),
        headerLeft: Number.parseFloat(window.getComputedStyle(headerBox).paddingLeft),
        headerMax: window.getComputedStyle(headerInner).maxWidth,
        headerWidth: headerInner.getBoundingClientRect().width,
        linkSize: window.getComputedStyle(link).fontSize,
        linkWeight: window.getComputedStyle(link).fontWeight,
        linkTop: Number.parseFloat(window.getComputedStyle(link).paddingTop),
        linkLeft: Number.parseFloat(window.getComputedStyle(link).paddingLeft),
        linkHeight: link.getBoundingClientRect().height,
        linkRadius: Number.parseFloat(window.getComputedStyle(link).borderRadius),
        mainMax: window.getComputedStyle(main).maxWidth,
        mainTop: Number.parseFloat(window.getComputedStyle(main).paddingTop),
        mainLeft: Number.parseFloat(window.getComputedStyle(main).paddingLeft),
        mainBottom: Number.parseFloat(window.getComputedStyle(main).paddingBottom),
        mainWidth: main.getBoundingClientRect().width,
        mainX: main.getBoundingClientRect().x,
      };
    });

    expect(desktop.wordmarkSize).toBe('20px');
    expect(desktop.wordmarkWeight).toBe('800');
    expect(desktop.wordmarkSpacing).toBeLessThan(0);
    expect(desktop.headerTop).toBe(14);
    expect(desktop.headerLeft).toBe(40);
    expect(desktop.headerMax).toBe('none');
    expect(desktop.headerWidth).toBe(1640);
    expect(desktop.linkSize).toBe('14px');
    expect(desktop.linkWeight).toBe('600');
    expect(desktop.linkTop).toBe(10);
    expect(desktop.linkLeft).toBe(16);
    expect(desktop.linkHeight).toBeGreaterThanOrEqual(40);
    expect(desktop.linkRadius).toBeGreaterThanOrEqual(9999);
    expect(desktop.mainMax).toBe('none');
    expect(desktop.mainTop).toBe(32);
    expect(desktop.mainLeft).toBe(40);
    expect(desktop.mainBottom).toBe(64);
    expect(desktop.mainWidth).toBe(1720);
    expect(desktop.mainX).toBe(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await openWithAllCategories(page);
    await page.getByTestId('mobile-navigation-toggle').click();

    const mobile = await page.evaluate(() => {
      const wordmark = document.querySelector('header p') as HTMLElement;
      const headerBox = document.querySelector('header > div') as HTMLElement;
      const link = document.querySelector('#screen-navigation a') as HTMLElement;
      const main = document.querySelector('main') as HTMLElement;
      return {
        wordmarkSize: window.getComputedStyle(wordmark).fontSize,
        wordmarkWeight: window.getComputedStyle(wordmark).fontWeight,
        headerTop: Number.parseFloat(window.getComputedStyle(headerBox).paddingTop),
        headerBottom: Number.parseFloat(window.getComputedStyle(headerBox).paddingBottom),
        headerLeft: Number.parseFloat(window.getComputedStyle(headerBox).paddingLeft),
        linkSize: window.getComputedStyle(link).fontSize,
        linkWeight: window.getComputedStyle(link).fontWeight,
        linkHeight: link.getBoundingClientRect().height,
        linkRadius: Number.parseFloat(window.getComputedStyle(link).borderRadius),
        mainTop: Number.parseFloat(window.getComputedStyle(main).paddingTop),
        mainLeft: Number.parseFloat(window.getComputedStyle(main).paddingLeft),
        mainBottom: Number.parseFloat(window.getComputedStyle(main).paddingBottom),
        mainWidth: main.getBoundingClientRect().width,
      };
    });

    expect(mobile.wordmarkSize).toBe('20px');
    expect(mobile.wordmarkWeight).toBe('800');
    expect(mobile.headerTop).toBe(14);
    expect(mobile.headerBottom).toBe(12);
    expect(mobile.headerLeft).toBe(16);
    expect(mobile.linkSize).toBe('15px');
    expect(mobile.linkWeight).toBe('600');
    expect(mobile.linkHeight).toBeGreaterThanOrEqual(48);
    expect(mobile.linkRadius).toBe(12);
    expect(mobile.mainTop).toBe(20);
    expect(mobile.mainLeft).toBe(16);
    expect(mobile.mainBottom).toBe(32);
    expect(mobile.mainWidth).toBeLessThanOrEqual(390);
  });

  test('shows the logo mark beside the wordmark at desktop and phone widths', async ({ page }) => {
    await openWithAllCategories(page);

    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/?category=all', { waitUntil: 'networkidle' });
      await expect(page.getByTestId('visible-count')).toHaveText('3 transactions');

      const logo = page.getByTestId('application-logo');
      await expect(logo).toBeVisible();

      const metrics = await page.evaluate(() => {
        const mark = document.querySelector('[data-testid="application-logo"]') as SVGSVGElement;
        const wordmark = document.querySelector('header p') as HTMLElement;
        const markBox = mark.getBoundingClientRect();
        const wordmarkBox = wordmark.getBoundingClientRect();
        return {
          markWidth: markBox.width,
          markHeight: markBox.height,
          markRight: markBox.right,
          wordmarkLeft: wordmarkBox.left,
          markCentre: markBox.top + markBox.height / 2,
          wordmarkCentre: wordmarkBox.top + wordmarkBox.height / 2,
          pageWidth: window.innerWidth,
          pageScrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(metrics.markWidth).toBe(30);
      expect(metrics.markHeight).toBe(30);
      expect(metrics.wordmarkLeft - metrics.markRight).toBeCloseTo(10, 0);
      expect(Math.abs(metrics.markCentre - metrics.wordmarkCentre)).toBeLessThan(2);
      expect(metrics.pageScrollWidth).toBeLessThanOrEqual(metrics.pageWidth);
    }
  });

  test('applies the full-width frame to every route', async ({ page }) => {
    await interceptApi(page);
    await page.goto('/people', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();

    const frame = await page.evaluate(() => {
      const headerInner = document.querySelector('header > div > div') as HTMLElement;
      const main = document.querySelector('main') as HTMLElement;
      return {
        headerMax: window.getComputedStyle(headerInner).maxWidth,
        headerWidth: headerInner.getBoundingClientRect().width,
        mainMax: window.getComputedStyle(main).maxWidth,
        mainWidth: main.getBoundingClientRect().width,
        mainX: main.getBoundingClientRect().x,
        mainLeft: Number.parseFloat(window.getComputedStyle(main).paddingLeft),
      };
    });

    expect(frame.headerMax).toBe('none');
    expect(frame.headerWidth).toBe(1640);
    expect(frame.mainMax).toBe('none');
    expect(frame.mainWidth).toBe(1720);
    expect(frame.mainX).toBe(0);
    expect(frame.mainLeft).toBe(40);
  });

  test('matches the mock transaction typography, sheets, controls, and table', async ({ page }) => {
    await openWithAllCategories(page);

    const desktop = await page.evaluate(() => {
      const style = (element: Element) => window.getComputedStyle(element);
      const title = document.querySelector('h1') as HTMLElement;
      const summary = document.querySelector('[data-testid="visible-total"]') as HTMLElement;
      const label = document.querySelector('label[for="transaction-search"]') as HTMLElement;
      const input = document.querySelector('[data-testid="transaction-search"]') as HTMLElement;
      const select = document.querySelector('[data-testid="person-filter"]') as HTMLElement;
      const searchButton = document.querySelector('[data-testid="search-submit"]') as HTMLElement;
      const filterSheet = document.querySelector('[data-testid="filter-sheet"]') as HTMLElement;
      const tableSheet = document.querySelector('[data-testid="table-sheet"]') as HTMLElement;
      const headerRow = document.querySelector('thead tr') as HTMLElement;
      const sortButton = document.querySelector('[data-testid="sort-bookingDate"]') as HTMLElement;
      const bodyRow = document.querySelector('tbody tr') as HTMLElement;
      const cell = document.querySelector('tbody tr td:nth-child(4)') as HTMLElement;
      const booking = document.querySelector('tbody tr td:nth-child(2)') as HTMLElement;
      const amount = document.querySelector('tbody tr td:last-child') as HTMLElement;
      const pill = document.querySelector('[data-testid="row-category-select"]') as HTMLElement;
      const pillLabel = pill.closest('label') as HTMLElement;

      return {
        titleSize: style(title).fontSize,
        titleWeight: style(title).fontWeight,
        titleSpacing: Number.parseFloat(style(title).letterSpacing),
        summarySize: style(summary).fontSize,
        labelSize: style(label).fontSize,
        labelWeight: style(label).fontWeight,
        fontFamily: style(cell).fontFamily,
        inputHeight: input.getBoundingClientRect().height,
        inputRadius: style(input).borderRadius,
        inputSize: style(input).fontSize,
        inputLeft: Number.parseFloat(style(input).paddingLeft),
        selectHeight: select.getBoundingClientRect().height,
        selectRadius: style(select).borderRadius,
        selectLeft: Number.parseFloat(style(select).paddingLeft),
        buttonHeight: searchButton.getBoundingClientRect().height,
        buttonRadius: style(searchButton).borderRadius,
        buttonWeight: style(searchButton).fontWeight,
        buttonLeft: Number.parseFloat(style(searchButton).paddingLeft),
        filterRadius: style(filterSheet).borderRadius,
        filterTop: Number.parseFloat(style(filterSheet).paddingTop),
        filterLeft: Number.parseFloat(style(filterSheet).paddingLeft),
        filterShadow: style(filterSheet).boxShadow,
        filterBorder: style(filterSheet).border,
        tableRadius: style(tableSheet).borderRadius,
        tableTop: Number.parseFloat(style(tableSheet).paddingTop),
        tableLeft: Number.parseFloat(style(tableSheet).paddingLeft),
        tableBottom: Number.parseFloat(style(tableSheet).paddingBottom),
        tableShadow: style(tableSheet).boxShadow,
        tableBorder: style(tableSheet).border,
        headerSize: style(headerRow).fontSize,
        headerWeight: style(sortButton).fontWeight,
        headerSpacing: Number.parseFloat(style(headerRow).letterSpacing),
        headerHeight: headerRow.getBoundingClientRect().height,
        cellTop: Number.parseFloat(style(cell).paddingTop),
        cellLeft: Number.parseFloat(style(cell).paddingLeft),
        rowHeight: bodyRow.getBoundingClientRect().height,
        bookingWeight: style(booking).fontWeight,
        amountWeight: style(amount).fontWeight,
        pillSize: style(pill).fontSize,
        pillWeight: style(pill).fontWeight,
        pillTop: Number.parseFloat(style(pill).paddingTop),
        pillLeft: Number.parseFloat(style(pill).paddingLeft),
        pillHeight: pill.getBoundingClientRect().height,
        pillLabelHeight: pillLabel.getBoundingClientRect().height,
      };
    });

    expect(desktop.titleSize).toBe('34px');
    expect(desktop.titleWeight).toBe('800');
    expect(desktop.titleSpacing).toBeLessThan(0);
    expect(desktop.summarySize).toBe('15px');
    expect(desktop.labelSize).toBe('12px');
    expect(desktop.labelWeight).toBe('700');
    expect(desktop.fontFamily).toContain('Plus Jakarta Sans');
    expect(desktop.inputHeight).toBe(44);
    expect(desktop.inputRadius).toBe('12px');
    expect(desktop.inputSize).toBe('14px');
    expect(desktop.inputLeft).toBe(16);
    expect(desktop.selectHeight).toBe(44);
    expect(desktop.selectRadius).toBe('12px');
    expect(desktop.selectLeft).toBe(14);
    expect(desktop.buttonHeight).toBe(44);
    expect(desktop.buttonRadius).toBe('12px');
    expect(desktop.buttonWeight).toBe('700');
    expect(desktop.buttonLeft).toBe(22);
    expect(desktop.filterRadius).toBe('20px');
    expect(desktop.filterTop).toBe(20);
    expect(desktop.filterLeft).toBe(24);
    expect(desktop.filterShadow).toContain('rgba(40, 30, 120, 0.08)');
    expect(desktop.filterBorder).toBe('1px solid rgb(211, 207, 234)');
    expect(desktop.tableRadius).toBe('20px');
    expect(desktop.tableTop).toBe(8);
    expect(desktop.tableLeft).toBe(24);
    expect(desktop.tableBottom).toBe(16);
    expect(desktop.tableShadow).toContain('rgba(40, 30, 120, 0.08)');
    expect(desktop.tableBorder).toBe('1px solid rgb(211, 207, 234)');
    expect(desktop.headerSize).toBe('12px');
    expect(desktop.headerWeight).toBe('700');
    expect(desktop.headerSpacing).toBeCloseTo(0.72, 1);
    expect(desktop.headerHeight).toBeGreaterThanOrEqual(47);
    expect(desktop.headerHeight).toBeLessThanOrEqual(49);
    expect(desktop.cellTop).toBe(13);
    expect(desktop.cellLeft).toBe(8);
    expect(desktop.rowHeight).toBeGreaterThanOrEqual(44);
    expect(desktop.rowHeight).toBeLessThanOrEqual(48);
    expect(desktop.bookingWeight).toBe('600');
    expect(desktop.amountWeight).toBe('700');
    expect(desktop.pillSize).toBe('12px');
    expect(desktop.pillWeight).toBe('700');
    expect(desktop.pillTop).toBe(5);
    expect(desktop.pillLeft).toBe(12);
    expect(desktop.pillHeight).toBeLessThan(44);
    expect(desktop.pillLabelHeight).toBeGreaterThanOrEqual(44);

    await page.setViewportSize({ width: 390, height: 844 });
    await openWithAllCategories(page);

    const mobile = await page.evaluate(() => {
      const style = (element: Element) => window.getComputedStyle(element);
      const title = document.querySelector('h1') as HTMLElement;
      const summary = document.querySelector('[data-testid="visible-total"]') as HTMLElement;
      const input = document.querySelector('[data-testid="transaction-search"]') as HTMLElement;
      const select = document.querySelector('[data-testid="person-filter"]') as HTMLElement;
      const searchButton = document.querySelector('[data-testid="search-submit"]') as HTMLElement;
      const filterSheet = document.querySelector('[data-testid="filter-sheet"]') as HTMLElement;
      const card = document.querySelector('[data-testid="transaction-card"]') as HTMLElement;
      const pill = document.querySelector('[data-testid="row-category-select"]') as HTMLElement;
      const pillLabel = pill.closest('label') as HTMLElement;

      return {
        titleSize: style(title).fontSize,
        titleWeight: style(title).fontWeight,
        summarySize: style(summary).fontSize,
        inputHeight: input.getBoundingClientRect().height,
        inputSize: style(input).fontSize,
        inputLeft: Number.parseFloat(style(input).paddingLeft),
        selectHeight: select.getBoundingClientRect().height,
        selectLeft: Number.parseFloat(style(select).paddingLeft),
        buttonHeight: searchButton.getBoundingClientRect().height,
        buttonLeft: Number.parseFloat(style(searchButton).paddingLeft),
        filterRadius: style(filterSheet).borderRadius,
        filterPadding: Number.parseFloat(style(filterSheet).paddingTop),
        cardRadius: style(card).borderRadius,
        cardShadow: style(card).boxShadow,
        cardBorder: style(card).border,
        cardPadding: Number.parseFloat(style(card).paddingTop),
        cardGap: Number.parseFloat(style(card).rowGap),
        cardCount: document.querySelectorAll('[data-testid="transaction-card"]').length,
        tableCount: document.querySelectorAll('[data-testid="transactions-scroll"]').length,
        pillHeight: pill.getBoundingClientRect().height,
        pillLabelHeight: pillLabel.getBoundingClientRect().height,
      };
    });

    expect(mobile.titleSize).toBe('28px');
    expect(mobile.titleWeight).toBe('800');
    expect(mobile.summarySize).toBe('14px');
    expect(mobile.inputHeight).toBe(48);
    expect(mobile.inputSize).toBe('15px');
    expect(mobile.inputLeft).toBe(14);
    expect(mobile.selectHeight).toBe(48);
    expect(mobile.selectLeft).toBe(12);
    expect(mobile.buttonHeight).toBe(48);
    expect(mobile.buttonLeft).toBe(18);
    expect(mobile.filterRadius).toBe('18px');
    expect(mobile.filterPadding).toBe(14);
    expect(mobile.cardRadius).toBe('18px');
    expect(mobile.cardShadow).toContain('rgba(40, 30, 120, 0.08)');
    expect(mobile.cardBorder).toBe('1px solid rgb(211, 207, 234)');
    expect(mobile.cardPadding).toBe(16);
    expect(mobile.cardGap).toBe(10);
    expect(mobile.cardCount).toBe(3);
    expect(mobile.tableCount).toBe(0);
    expect(mobile.pillHeight).toBeLessThan(44);
    expect(mobile.pillLabelHeight).toBeGreaterThanOrEqual(44);
  });

  test('centres the empty state in a flat sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await interceptApi(page, []);
    await page.goto('/?category=all', { waitUntil: 'networkidle' });

    const sheet = page.getByTestId('table-sheet');
    await expect(sheet).toBeVisible();
    const message = sheet.getByText('There are no transactions to show.');
    await expect(message).toBeVisible();

    const empty = await page.evaluate(() => {
      const sheetElement = document.querySelector('[data-testid="table-sheet"]') as HTMLElement;
      const messageElement = sheetElement.querySelector('p') as HTMLElement;
      const sheetStyle = window.getComputedStyle(sheetElement);
      const messageStyle = window.getComputedStyle(messageElement);
      return {
        sheetRadius: sheetStyle.borderRadius,
        sheetShadow: sheetStyle.boxShadow,
        sheetTop: Number.parseFloat(sheetStyle.paddingTop),
        messageSize: messageStyle.fontSize,
        messageAlign: messageStyle.textAlign,
      };
    });

    expect(empty.sheetRadius).toBe('18px');
    expect(empty.sheetShadow).toContain('rgba(40, 30, 120, 0.08)');
    expect(empty.sheetTop).toBe(40);
    expect(empty.messageSize).toBe('14px');
    expect(empty.messageAlign).toBe('center');
  });

  test('presents the brand bar, summary, sheets, pills, and amount-last table', async ({ page }) => {
    await openWithAllCategories(page);

    const header = page.locator('header');
    await expect(header.getByText('Expenses', { exact: true })).toBeVisible();
    const headerBackground = await header.evaluate((element) => window.getComputedStyle(element).backgroundImage);
    expect(headerBackground).toContain('linear-gradient');

    const links = page.locator('#screen-navigation a');
    await expect(links).toHaveCount(5);
    await expect(links).toHaveText([
      'Transactions',
      'Monthly',
      'Yearly',
      'Monthly average',
      'Manage',
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
      const filterSheet = document.querySelector('[data-testid="filter-sheet"]') as HTMLElement;
      const tableSheet = document.querySelector('[data-testid="table-sheet"]') as HTMLElement;
      return {
        filterBackground: window.getComputedStyle(filterSheet).backgroundColor,
        filterRadius: window.getComputedStyle(filterSheet).borderRadius,
        filterBorder: window.getComputedStyle(filterSheet).border,
        tableBackground: window.getComputedStyle(tableSheet).backgroundColor,
        tableRadius: window.getComputedStyle(tableSheet).borderRadius,
        tableBorder: window.getComputedStyle(tableSheet).border,
      };
    });
    expect(sheetStyles.filterBackground).toBe('rgb(255, 255, 255)');
    expect(sheetStyles.tableBackground).toBe('rgb(255, 255, 255)');
    expect(sheetStyles.filterRadius).toBe('20px');
    expect(sheetStyles.tableRadius).toBe('20px');
    expect(sheetStyles.filterBorder).toBe('1px solid rgb(211, 207, 234)');
    expect(sheetStyles.tableBorder).toBe('1px solid rgb(211, 207, 234)');

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
        categorisedText: (categorised as HTMLSelectElement).selectedOptions[0]?.text ?? '',
        uncategorisedBackground: window.getComputedStyle(uncategorised).backgroundColor,
        uncategorisedText: (uncategorised as HTMLSelectElement).selectedOptions[0]?.text ?? '',
      };
    });
    expect(pills.categorisedBackground).not.toBe(pills.uncategorisedBackground);
    expect(pills.categorisedBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(pills.categorisedColor).not.toBe('');
    expect(pills.categorisedText).toBe('Groceries');
    expect(contrastRatio(pills.categorisedColor, pills.categorisedBackground)).toBeGreaterThanOrEqual(4.5);
    expect(Number.parseFloat(pills.categorisedRadius)).toBeGreaterThanOrEqual(9999);
    expect(pills.uncategorisedBackground).toBe('rgb(255, 255, 255)');
    expect(pills.uncategorisedText).toBe('Uncategorised');

    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('transactions-batch-sentinel')).toHaveCount(1);
  });

  test('keeps the home family for categories the Monthly resolver would separate', async ({ page }) => {
    const householdCategory = {
      id: '21',
      name: 'Household',
      patterns: ['home'],
      hidden: false,
      windows: [],
    };
    await interceptApi(page, [
      {
        ...transactions[0],
        id: 'groceries',
        category: { id: '1', name: 'Groceries', hidden: false },
      },
      {
        ...transactions[0],
        id: 'household',
        purpose: 'Household shop',
        category: { id: '21', name: 'Household', hidden: false },
      },
    ], [...categories, householdCategory]);
    await page.goto('/?category=all', { waitUntil: 'networkidle' });

    const backgrounds = await page.evaluate(() => {
      const background = (transactionId: string) => {
        const select = document.querySelector(
          `[data-transaction-id="${transactionId}"] [data-testid="row-category-select"]`,
        ) as HTMLElement | null;
        return select === null ? '' : window.getComputedStyle(select).backgroundColor;
      };

      return {
        groceries: background('groceries'),
        household: background('household'),
      };
    });

    expect(backgrounds.household).toBe(backgrounds.groceries);
  });

  test('every categorised pill name clears 4.5:1 against its tint', async ({ page }) => {
    await openWithAllCategories(page);

    const pills = await page.locator('[data-testid="row-category-select"]').evaluateAll((elements) =>
      elements
        .filter((element) => (element as HTMLSelectElement).value !== '')
        .map((element) => ({
          name: (element as HTMLSelectElement).selectedOptions[0]?.text ?? '',
          colour: window.getComputedStyle(element).color,
          ground: window.getComputedStyle(element).backgroundColor,
        })));

    expect(pills.length).toBeGreaterThan(0);
    for (const pill of pills) {
      expect(pill.name).not.toBe('');
      expect(contrastRatio(pill.colour, pill.ground), pill.name).toBeGreaterThanOrEqual(4.5);
    }
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

  test('links to category management beside the Category filter without changing it', async ({ page }) => {
    await openWithAllCategories(page);

    const link = page.getByTestId('manage-categories-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/categories');
    await expect(page.getByTestId('category-filter')).toHaveValue('all');
    await expect(page.getByTestId('category-filter').locator('option')).toHaveText([
      'All categories (3)',
      'Uncategorised (1)',
      'Groceries',
      'Transport',
    ]);

    await link.click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
  });

  test.describe('at 320 CSS pixels', () => {
    test.use({ viewport: { width: 320, height: 640 } });

    test('the category-management link is touch sized and reaches the category screen', async ({ page }) => {
      await openWithAllCategories(page);

      const link = page.getByTestId('manage-categories-link');
      await expect(link).toBeVisible();
      const height = await link.evaluate((element) => element.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(44);

      await link.click();
      await expect(page).toHaveURL(/\/categories$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
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

      await expect(page.locator('#screen-navigation a')).toHaveCount(5);
      const navigationLinks = page.locator('#screen-navigation a:visible');
      await expect(navigationLinks).toHaveCount(5);

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

      if (viewport.width < 640) {
        await expect(page.getByTestId('transaction-card')).toHaveCount(3);
        await expect(page.getByTestId('transactions-scroll')).toHaveCount(0);
      } else {
        const tableRegion = page.getByTestId('transactions-scroll');
        expect(await tableRegion.evaluate((element) => element.scrollWidth > element.clientWidth))
          .toBe(viewport.width < 1024);
      }

      if (viewport.width <= 390) {
        const shortControls = await page.locator(
          'button:visible, select:visible:not([data-testid="row-category-select"]), input:not([type="checkbox"]):visible, #screen-navigation a:visible, [data-testid="manage-categories-link"]:visible',
        ).evaluateAll((elements) => elements
          .filter((element) => element.getBoundingClientRect().height < 44)
          .map((element) => ({
            element: element.tagName,
            label: (element.textContent ?? '').trim(),
            height: element.getBoundingClientRect().height,
          })));
        expect(shortControls).toEqual([]);
        const pillHeight = await page.locator('[data-testid="row-category-select"]').first()
          .evaluate((element) => (element.closest('label') as HTMLElement).getBoundingClientRect().height);
        expect(pillHeight).toBeGreaterThanOrEqual(44);
      }
    });
  }
});
