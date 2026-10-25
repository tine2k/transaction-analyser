import { expect, test, type Page } from '@playwright/test';

// The phone Transactions view: the mock's card list, the compact toolbar that
// keeps selection and sorting available, explicit Load more batching, the mock's
// filter-sheet arrangement, and the pattern shortcut inside one card field.
// Every read is intercepted, so the checklist uses fixed data and writes nothing.

const currentYear = new Date().getFullYear();

const categories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
  { id: '2', name: 'Transport', patterns: ['transit'], hidden: false, windows: [] },
];

const transactions = [
  {
    id: 'categorised',
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

function manyTransactions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `bulk-${index}`,
    bookingDate: `${currentYear}-02-01`,
    valueDate: `${currentYear}-02-01`,
    amount: `-${index + 1}.00`,
    purpose: `Transaction ${String(index).padStart(2, '0')}`,
    counterpartyName: `Merchant ${index}`,
    counterpartyAccount: null,
    person: { id: '1', name: 'Default' },
    categoryAssignment: 'automatic',
    category: null,
  }));
}

async function interceptApi(page: Page, rows = transactions): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/transactions' && method === 'GET') {
      await route.fulfill({ json: rows });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: categories });
      return;
    }

    if (pathname === '/api/people' && method === 'GET') {
      await route.fulfill({ json: [] });
      return;
    }

    if (pathname === '/api/categories/literal-match-count' && method === 'POST') {
      await route.fulfill({ json: { count: 1 } });
      return;
    }

    if (pathname === '/api/categories/1/patterns' && method === 'POST') {
      await route.fulfill({
        json: {
          category: { ...categories[0], patterns: ['market', 'Weekly shop'] },
          added: true,
        },
      });
      return;
    }

    if (pathname === '/api/transactions/category-assignments' && method === 'POST') {
      await route.fulfill({ json: {} });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

async function openPhone(page: Page, rows = transactions): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await interceptApi(page, rows);
  await page.goto('/?category=all', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('transaction-card').first()).toBeVisible();
}

test.describe('phone transactions cards', () => {
  test('presents every transaction as a card with the mock card metrics', async ({ page }) => {
    await openPhone(page);

    await expect(page.getByTestId('transaction-card')).toHaveCount(3);
    await expect(page.getByTestId('transactions-scroll')).toHaveCount(0);
    await expect(page.locator('thead')).toHaveCount(0);

    const card = page.locator('[data-transaction-id="categorised"]');
    await expect(card).toContainText('Weekly shop');
    await expect(card).toContainText('-12.50');
    await expect(card).toContainText('Groceries');
    await expect(card).toContainText(`Booked 10 Feb ${currentYear}`);
    await expect(card).toContainText(`Value 11 Feb ${currentYear}`);
    await expect(card).toContainText('Market');
    await expect(card).toContainText('AT001');
    await expect(card).toContainText('Default');

    const absentAccount = page.locator('[data-transaction-id="transport"]');
    await expect(absentAccount).toContainText('—');
    await expect(absentAccount).toContainText('No counterparty account');

    const metrics = await page.locator('[data-transaction-id="categorised"]').evaluate((element) => {
      const style = (selector: string) => window.getComputedStyle(element.querySelector(selector) as Element);
      const cardStyle = window.getComputedStyle(element);
      return {
        radius: cardStyle.borderRadius,
        shadow: cardStyle.boxShadow,
        padding: Number.parseFloat(cardStyle.paddingTop),
        gap: Number.parseFloat(cardStyle.rowGap),
        background: cardStyle.backgroundColor,
        purposeSize: style('[data-transaction-field="purpose"]').fontSize,
        purposeWeight: style('[data-transaction-field="purpose"]').fontWeight,
        amountSize: style('[data-transaction-field="amount"]').fontSize,
        amountWeight: style('[data-transaction-field="amount"]').fontWeight,
        amountColor: style('[data-transaction-field="amount"]').color,
        metaSize: style('[data-transaction-field="bookingDate"]').fontSize,
        pillSize: style('[data-testid="row-category-select"]').fontSize,
        pillWeight: style('[data-testid="row-category-select"]').fontWeight,
        pillHeight: (element.querySelector('[data-testid="row-category-select"]') as HTMLElement)
          .getBoundingClientRect().height,
        pillLabelHeight: (element.querySelector('[data-testid="row-category-select"]') as HTMLElement)
          .closest('label')?.getBoundingClientRect().height ?? 0,
      };
    });

    expect(metrics.radius).toBe('18px');
    expect(metrics.shadow).toBe('none');
    expect(metrics.padding).toBe(16);
    expect(metrics.gap).toBe(10);
    expect(metrics.background).toBe('rgb(255, 255, 255)');
    expect(metrics.purposeSize).toBe('15px');
    expect(metrics.purposeWeight).toBe('700');
    expect(metrics.amountSize).toBe('15px');
    expect(metrics.amountWeight).toBe('800');
    expect(metrics.amountColor).toBe('rgb(32, 30, 62)');
    expect(metrics.metaSize).toBe('12px');
    expect(metrics.pillSize).toBe('12px');
    expect(metrics.pillWeight).toBe('700');
    expect(metrics.pillHeight).toBeLessThan(44);
    expect(metrics.pillLabelHeight).toBeGreaterThanOrEqual(44);
  });

  test('switches from cards to the table at sm and back', async ({ page }) => {
    await openPhone(page);
    await expect(page.getByTestId('transaction-card')).toHaveCount(3);

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('transactions-scroll')).toBeVisible();
    await expect(page.getByTestId('transaction-card')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(3);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('transaction-card')).toHaveCount(3);
    await expect(page.getByTestId('transactions-scroll')).toHaveCount(0);
  });

  test('selects the view and sorts by column and direction', async ({ page }) => {
    await openPhone(page);

    const selectAll = page.getByTestId('select-all-visible');
    const selectAllTargetHeight = await selectAll.evaluate((element) =>
      (element.closest('label') as HTMLElement).getBoundingClientRect().height);
    expect(selectAllTargetHeight).toBeGreaterThanOrEqual(44);

    await selectAll.check();
    expect(await page.getByTestId('row-select').evaluateAll((elements) =>
      elements.map((element) => (element as HTMLInputElement).checked))).toEqual([true, true, true]);
    await expect(page.getByTestId('bulk-assignment-count')).toHaveText('3 transactions selected');

    await selectAll.uncheck();
    await expect(page.getByTestId('bulk-assignment-bar')).toHaveCount(0);

    const sort = page.getByTestId('mobile-sort');
    const direction = page.getByTestId('mobile-sort-direction');
    await expect(sort).toHaveAccessibleName('Sort by');
    await expect(direction).toBeDisabled();
    expect((await sort.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await direction.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    await sort.selectOption('purpose');
    await expect(page).toHaveURL(/sort=purpose/);
    await expect(page).toHaveURL(/direction=asc/);
    await expect(direction).toHaveText('Ascending');
    await expect(direction).toHaveAccessibleName('Sort direction: ascending');
    await expect(page.getByTestId('transaction-card').first()).toContainText('Local shop');

    await direction.click();
    await expect(page).toHaveURL(/direction=desc/);
    await expect(direction).toHaveText('Descending');
    await expect(direction).toHaveAccessibleName('Sort direction: descending');
    await expect(page.getByTestId('transaction-card').first()).toContainText('Weekly shop');

    await sort.selectOption('');
    await expect.poll(() => new URL(page.url()).searchParams.has('sort')).toBe(false);
    await expect.poll(() => new URL(page.url()).searchParams.has('direction')).toBe(false);
    await expect(direction).toBeDisabled();
    await expect(page.getByTestId('transaction-card').first()).toContainText('Weekly shop');
  });

  test('appends a phone batch only from Load more', async ({ page }) => {
    const rows = manyTransactions(51);
    await openPhone(page, rows);

    await expect(page.getByTestId('transaction-card')).toHaveCount(50);
    await expect(page.getByTestId('load-more')).toBeVisible();
    await expect(page.getByTestId('transactions-batch-sentinel')).toHaveCount(0);
    const firstCardId = await page.getByTestId('transaction-card').first().getAttribute('data-transaction-id');

    await page.getByTestId('load-more').click();
    await expect(page.getByTestId('transaction-card')).toHaveCount(51);
    await expect(page.getByTestId('load-more')).toHaveCount(0);
    await expect(page.getByTestId('transaction-card').first())
      .toHaveAttribute('data-transaction-id', firstCardId ?? '');
  });

  test('keeps the desktop table and its sentinel from sm up', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await interceptApi(page, manyTransactions(51));
    await page.goto('/?category=all', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('transaction-card')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(50);
    await expect(page.getByTestId('transactions-batch-sentinel')).toHaveCount(1);
    await expect(page.getByTestId('load-more')).toHaveCount(0);
  });

  test('arranges the phone filter sheet like the mock', async ({ page }) => {
    await openPhone(page);

    async function layout() {
      return page.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector(selector) as HTMLElement;
          return element.getBoundingClientRect();
        };
        const sheet = rect('[data-testid="filter-sheet"]');
        return {
          search: rect('[data-testid="transaction-search"]'),
          searchButton: rect('[data-testid="search-submit"]'),
          person: rect('[data-testid="person-filter"]'),
          period: rect('[data-testid="period-filter"]'),
          category: rect('[data-testid="category-filter"]'),
          sheetWidth: sheet.width,
          pageWidth: window.innerWidth,
          bodyWidth: document.body.scrollWidth,
        };
      });
    }

    const phone = await layout();
    expect(Math.abs(phone.search.y - phone.searchButton.y)).toBeLessThan(2);
    expect(phone.search.x + phone.search.width).toBeLessThanOrEqual(phone.searchButton.x + 1);
    expect(Math.abs(phone.person.y - phone.period.y)).toBeLessThan(2);
    expect(phone.category.y).toBeGreaterThan(phone.person.y + phone.person.height);
    expect(phone.category.width).toBeGreaterThan(phone.sheetWidth - 30);
    expect(phone.bodyWidth).toBeLessThanOrEqual(phone.pageWidth);

    await expect(page.getByTestId('transaction-search')).toHaveAccessibleName('Search transactions');
    await expect(page.getByTestId('person-filter')).toHaveAccessibleName(/Person/);
    await expect(page.getByTestId('period-filter')).toHaveAccessibleName(/Period/);
    await expect(page.getByTestId('category-filter')).toHaveAccessibleName(/Category/);

    await page.setViewportSize({ width: 320, height: 640 });
    await page.reload({ waitUntil: 'networkidle' });
    const narrow = await layout();
    expect(Math.abs(narrow.search.y - narrow.searchButton.y)).toBeLessThan(2);
    expect(Math.abs(narrow.person.y - narrow.period.y)).toBeLessThan(2);
    expect(narrow.category.width).toBeGreaterThan(narrow.sheetWidth - 30);
    expect(narrow.bodyWidth).toBeLessThanOrEqual(narrow.pageWidth);
  });

  test('accepts a selection inside one card field and rejects a multi-field one', async ({ page }) => {
    await openPhone(page);

    await page.evaluate(() => {
      const field = document.querySelector(
        '[data-transaction-id="categorised"] [data-transaction-field="purpose"]',
      ) as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(field);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    await expect(page.getByTestId('pattern-shortcut-bar')).toBeVisible();
    await expect(page.getByTestId('pattern-shortcut-text')).toHaveText('Weekly shop');

    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const start = document.querySelector(
        '[data-transaction-id="categorised"] [data-transaction-field="purpose"]',
      ) as HTMLElement;
      const end = document.querySelector(
        '[data-transaction-id="categorised"] [data-transaction-field="counterpartyName"]',
      ) as HTMLElement;
      const range = document.createRange();
      range.setStart(start.firstChild as Node, 0);
      range.setEnd(end.firstChild as Node, (end.firstChild as Node).textContent?.length ?? 0);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    await expect(page.getByTestId('pattern-shortcut-bar')).toHaveCount(0);
  });
});
