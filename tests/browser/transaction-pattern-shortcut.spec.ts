import { expect, test, type Page } from '@playwright/test';

// The transaction pattern shortcut, exercised in headless Chromium against the
// built application. The API is intercepted, so the check exercises the real
// selection handling, the action bar, the append request, the row marker, and
// the coalesced refresh rather than live data.
//
// See openspec/changes/add-transaction-pattern-shortcut/specs/transaction-pattern-shortcut/spec.md

type RecordedRequest = { method: string; pathname: string; body: unknown };

const transactions = [
  {
    id: '2',
    bookingDate: '2026-02-10',
    valueDate: '2026-02-10',
    amount: '-12.50',
    purpose: 'REWE Markt Berlin 4711',
    counterpartyName: 'REWE',
    counterpartyAccount: null,
    category: null,
  },
  {
    id: '1',
    bookingDate: '2026-02-01',
    valueDate: '2026-02-01',
    amount: '-5.00',
    purpose: 'Already sorted',
    counterpartyName: 'Shop',
    counterpartyAccount: null,
    category: { id: '1', name: 'Groceries', hidden: false },
  },
];

const refreshedTransactions = [
  { ...transactions[0], category: { id: '1', name: 'Groceries', hidden: false } },
  transactions[1],
];

const categories = [
  { id: '1', name: 'Groceries', patterns: ['market'], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: ['travel'], hidden: false, windows: [] },
  { id: '3', name: 'Internal', patterns: ['internal'], hidden: true, windows: [] },
];

async function interceptApi(page: Page, options: { failAppend?: boolean } = {}): Promise<RecordedRequest[]> {
  const recorded: RecordedRequest[] = [];
  let transactionReads = 0;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const body = request.postData() === null ? null : request.postDataJSON();
    recorded.push({ method, pathname, body });

    if (pathname === '/api/transactions' && method === 'GET') {
      transactionReads += 1;
      await route.fulfill({ json: transactionReads === 1 ? transactions : refreshedTransactions });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: categories });
      return;
    }

    if (pathname === '/api/categories/literal-match-count' && method === 'POST') {
      await route.fulfill({ json: { count: 3 } });
      return;
    }

    if (pathname === '/api/categories/1/patterns' && method === 'POST') {
      if (options.failAppend === true) {
        await route.fulfill({ status: 500, json: { message: 'the pattern request could not be completed' } });
        return;
      }
      // Hold the append open so the in-flight marker and status are observable.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ json: { category: { ...categories[0], patterns: ['market', 'REWE Markt'] }, added: true } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });

  return recorded;
}

async function selectTextInCell(page: Page, transactionId: string, start: number, end: number): Promise<string> {
  return page.evaluate(({ transactionId: id, start: startIndex, end: endIndex }) => {
    const cell = document.querySelector(`[data-transaction-id="${id}"] td:nth-child(4)`);
    const node = cell?.firstChild ?? null;
    if (node === null) {
      throw new Error('purpose cell is not rendered');
    }
    const range = document.createRange();
    range.setStart(node, startIndex);
    range.setEnd(node, endIndex);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return (node as Text).data.slice(startIndex, endIndex);
  }, { transactionId, start, end });
}

async function selectAcrossCells(page: Page, transactionId: string): Promise<void> {
  await page.evaluate((id) => {
    const purpose = document.querySelector(`[data-transaction-id="${id}"] td:nth-child(4)`)?.firstChild ?? null;
    const counterparty = document.querySelector(`[data-transaction-id="${id}"] td:nth-child(5)`)?.firstChild ?? null;
    if (purpose === null || counterparty === null) {
      throw new Error('row is not rendered');
    }
    const range = document.createRange();
    range.setStart(purpose, 0);
    range.setEnd(counterparty, (counterparty as Text).data.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, transactionId);
}

test('a selection appends a literal pattern, marks the row, and refreshes in place', async ({ page }) => {
  const recorded = await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('category-filter').selectOption('all');

  const selected = await selectTextInCell(page, '2', 0, 10);
  expect(selected).toBe('REWE Markt');

  const bar = page.getByTestId('pattern-shortcut-bar');
  await expect(bar).toBeVisible();
  await expect(page.getByTestId('pattern-shortcut-text')).toHaveText('REWE Markt');
  await expect(page.getByTestId('pattern-shortcut-preview')).toContainText('Matches 3 stored transactions');

  await page.getByTestId('pattern-shortcut-category').selectOption('1');

  await expect(page.getByTestId('pattern-shortcut-status')).toHaveText('1 update applying…');
  await expect(page.getByTestId('row-updating')).toBeVisible();
  await expect(page.getByTestId('pattern-shortcut-text')).toHaveCount(0);

  const row = page.locator('[data-transaction-id="2"]');
  await expect(row.locator('td').nth(6)).toHaveText('Groceries');
  await expect(page.getByTestId('row-updating')).toHaveCount(0);

  const appends = recorded.filter((entry) => entry.pathname === '/api/categories/1/patterns');
  expect(appends).toHaveLength(1);
  expect(appends[0]?.body).toEqual({ text: 'REWE Markt' });
  const reads = recorded.filter((entry) => entry.pathname === '/api/transactions' && entry.method === 'GET');
  expect(reads).toHaveLength(2);
});

test('a selection shorter than three characters shows no bar', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await selectTextInCell(page, '2', 0, 2);

  await expect(page.getByTestId('pattern-shortcut-bar')).toHaveCount(0);
});

test('a selection spanning two cells shows no bar', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  await selectAcrossCells(page, '2');

  await expect(page.getByTestId('pattern-shortcut-bar')).toHaveCount(0);
});

test('a failed append keeps the bar with the captured text and the error', async ({ page }) => {
  await interceptApi(page, { failAppend: true });
  await page.goto('/', { waitUntil: 'networkidle' });

  await selectTextInCell(page, '2', 0, 10);
  await expect(page.getByTestId('pattern-shortcut-bar')).toBeVisible();

  await page.getByTestId('pattern-shortcut-category').selectOption('1');

  await expect(page.getByTestId('pattern-shortcut-status')).toContainText('Could not add to Groceries');
  await expect(page.getByTestId('pattern-shortcut-text')).toHaveText('REWE Markt');
  await expect(page.locator('[data-transaction-id="2"] td').nth(6)).toContainText('—');
  await expect(page.locator('[data-transaction-id="2"] td').nth(6)).not.toContainText('Groceries');
});
