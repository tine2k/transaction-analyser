import { expect, test, type Page } from '@playwright/test';

// Manual category assignment, exercised in headless Chromium against the built
// application. The API is intercepted, so the checks exercise the real per-row
// control, the pin marker, the selection column, the bulk bar, and the coalesced
// refresh rather than live data. The intercepted assignment applies the same
// visible outcome the server produces: pinning names a category and records the
// assignment as manual, and clearing re-derives the category with the fixture's
// matching rule.
//
// See openspec/changes/add-manual-category-assignment/specs/manual-category-assignment/spec.md

type RecordedRequest = { method: string; pathname: string; body: unknown };
type FixtureCategory = { id: string; name: string; hidden: boolean };
type AssignedTransaction = {
  id: string;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
  person: { id: string; name: string };
  categoryAssignment: 'manual' | 'automatic';
  category: FixtureCategory | null;
};

const categories = [
  { id: '1', name: 'Groceries', patterns: ['sorted'], hidden: false, windows: [] },
  { id: '2', name: 'Travel', patterns: ['travel'], hidden: false, windows: [] },
];

function fixtureTransactions(): AssignedTransaction[] {
  return [
    {
      id: '2',
      bookingDate: '2026-02-10',
      valueDate: '2026-02-10',
      amount: '-12.50',
      purpose: 'REWE Markt Berlin 4711',
      counterpartyName: 'REWE',
      counterpartyAccount: null,
      person: { id: '1', name: 'Default' },
      categoryAssignment: 'automatic',
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
      person: { id: '1', name: 'Default' },
      categoryAssignment: 'automatic',
      category: { id: '1', name: 'Groceries', hidden: false },
    },
  ];
}

function applyAssignment(
  transactions: AssignedTransaction[],
  body: { transactionIds: string[]; categoryId: string | null },
): void {
  for (const transaction of transactions) {
    if (!body.transactionIds.includes(transaction.id)) {
      continue;
    }
    if (body.categoryId === null) {
      const matched = categories.find((category) =>
        category.patterns.some((pattern) => transaction.purpose.toLowerCase().includes(pattern)));
      transaction.category = matched === undefined
        ? null
        : { id: matched.id, name: matched.name, hidden: matched.hidden };
      transaction.categoryAssignment = 'automatic';
    } else {
      const chosen = categories.find((category) => category.id === body.categoryId);
      if (chosen !== undefined) {
        transaction.category = { id: chosen.id, name: chosen.name, hidden: chosen.hidden };
        transaction.categoryAssignment = 'manual';
      }
    }
  }
}

async function interceptApi(page: Page): Promise<RecordedRequest[]> {
  const recorded: RecordedRequest[] = [];
  const state = fixtureTransactions();

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const body = request.postData() === null ? null : request.postDataJSON();
    recorded.push({ method, pathname, body });

    if (pathname === '/api/transactions' && method === 'GET') {
      await route.fulfill({ json: state });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await route.fulfill({ json: categories });
      return;
    }

    if (pathname === '/api/transactions/category-assignments' && method === 'POST') {
      // Hold the write open so the in-flight marker and disabled control are observable.
      await new Promise((resolve) => setTimeout(resolve, 300));
      applyAssignment(state, body as { transactionIds: string[]; categoryId: string | null });
      await route.fulfill({
        json: { updated: (body as { transactionIds: string[] }).transactionIds.length },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });

  return recorded;
}

test('a row assignment pins the transaction and marks the row', async ({ page }) => {
  const recorded = await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('category-filter').selectOption('all');

  const row = page.locator('[data-transaction-id="2"]');
  await expect(row.getByTestId('manual-assignment-marker')).toHaveCount(0);

  await row.getByTestId('row-category-select').selectOption('2');

  await expect(row.getByTestId('row-category-select')).toBeDisabled();
  await expect(page.getByTestId('pattern-shortcut-status')).toHaveText('1 update applying…');

  await expect(row.getByTestId('row-category-select')).toHaveValue('2');
  await expect(row.getByTestId('manual-assignment-marker')).toBeVisible();
  await expect(page.getByTestId('row-updating')).toHaveCount(0);

  const assignments = recorded.filter((entry) => entry.pathname === '/api/transactions/category-assignments');
  expect(assignments).toHaveLength(1);
  expect(assignments[0]?.body).toEqual({ transactionIds: ['2'], categoryId: '2' });
});

test('choosing Uncategorised on a rule-derived row snaps back to the rule category', async ({ page }) => {
  const recorded = await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('category-filter').selectOption('all');

  const row = page.locator('[data-transaction-id="1"]');
  await row.getByTestId('row-category-select').selectOption('');

  await expect(row.getByTestId('row-category-select')).toHaveValue('1');
  await expect(row.getByTestId('manual-assignment-marker')).toHaveCount(0);

  const assignments = recorded.filter((entry) => entry.pathname === '/api/transactions/category-assignments');
  expect(assignments).toHaveLength(1);
  expect(assignments[0]?.body).toEqual({ transactionIds: ['1'], categoryId: null });
});

test('select-all and bulk apply assign every shown transaction', async ({ page }) => {
  const recorded = await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('category-filter').selectOption('all');

  await page.getByTestId('select-all-visible').check();
  await expect(page.getByTestId('bulk-assignment-bar')).toBeVisible();
  await expect(page.getByTestId('bulk-assignment-count')).toContainText('2 transactions selected');

  await page.getByTestId('bulk-assignment-category').selectOption('2');
  await page.getByTestId('bulk-assignment-apply').click();

  await expect(page.getByTestId('bulk-assignment-bar')).toHaveCount(0);
  for (const id of ['2', '1']) {
    const row = page.locator(`[data-transaction-id="${id}"]`);
    await expect(row.getByTestId('row-category-select')).toHaveValue('2');
    await expect(row.getByTestId('manual-assignment-marker')).toBeVisible();
  }

  const assignments = recorded.filter((entry) => entry.pathname === '/api/transactions/category-assignments');
  expect(assignments).toHaveLength(1);
  expect(assignments[0]?.body).toEqual({ transactionIds: ['2', '1'], categoryId: '2' });
});

test('the assignment controls measure at least 44 CSS pixels high', async ({ page }) => {
  await interceptApi(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('category-filter').selectOption('all');
  await page.getByTestId('select-all-visible').check();

  const heights = await page.evaluate(() => {
    const selectors = [
      '[data-testid="row-category-select"]',
      '[data-testid="bulk-assignment-category"]',
      '[data-testid="bulk-assignment-apply"]',
      '[data-testid="bulk-assignment-clear"]',
    ];
    return selectors.map((selector) => document.querySelector(selector)?.getBoundingClientRect().height ?? 0);
  });

  expect(heights).toHaveLength(4);
  for (const height of heights) {
    expect(height).toBeGreaterThanOrEqual(44);
  }
});
