import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const status = (page: Page) => page.getByRole('status');

test('create form shows a live count without saving', async ({ page }) => {
  let createRequests = 0;
  await page.route('**/api/categories', async (route) => {
    if (route.request().method() === 'POST') {
      createRequests += 1;
    }
    await route.continue();
  });

  await page.goto('/categories');
  await expect(status(page)).toHaveText('Enter an expression to preview matching transactions.');

  await page.locator('form fieldset input[type="text"]').first().fill('rewe');
  await expect(status(page)).toHaveText('Matches 2 stored transactions.');
  await page.locator('form fieldset input[type="text"]').first().fill('no-such-merchant');
  await expect(status(page)).toHaveText('Matches 0 stored transactions.');
  expect(createRequests).toBe(0);
});

test('edit form previews the current expression values', async ({ page }) => {
  await page.goto('/categories');
  const categoryRow = page.getByRole('row').filter({ hasText: 'Groceries preview' });
  await categoryRow.getByRole('button', { name: 'Edit' }).click();

  await expect(status(page)).toHaveText('Matches 2 stored transactions.');
  const expressions = page.locator('form fieldset input[type="text"]');
  await expressions.nth(0).fill('bookshop');
  await expressions.nth(1).fill('not-a-match');
  await expect(status(page)).toHaveText('Matches 1 stored transaction.');
});

test('a slower outdated response cannot replace the latest count', async ({ page }) => {
  let releaseSlowResponse: (() => void) | undefined;
  let slowRequestStarted: (() => void) | undefined;
  const slowStarted = new Promise<void>((resolve) => {
    slowRequestStarted = resolve;
  });

  await page.route('**/api/categories/match-count', async (route) => {
    const patterns = route.request().postDataJSON()?.patterns as string[] | undefined;
    if (patterns?.[0] === 'slow') {
      slowRequestStarted?.();
      await new Promise<void>((resolve) => {
        releaseSlowResponse = resolve;
      });
      await route.fulfill({ json: { count: 1 } });
      return;
    }
    await route.fulfill({ json: { count: 9 } });
  });

  await page.goto('/categories');
  const expression = page.locator('form fieldset input[type="text"]').first();
  await expression.fill('slow');
  await slowStarted;
  await expect(status(page)).toHaveText('Checking matching transactions…');
  await expression.fill('fast');
  await expect(status(page)).toHaveText('Matches 9 stored transactions.');

  releaseSlowResponse?.();
  await expect(status(page)).toHaveText('Matches 9 stored transactions.');
});

test('preview errors do not write a category or block the normal submit', async ({ page }) => {
  let createBody: unknown;
  await page.route('**/api/categories/match-count', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"unavailable"}' }),
  );
  await page.route('**/api/categories', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    createBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: '999', name: 'Preview only', patterns: ['rewe'] }),
    });
  });

  await page.goto('/categories');
  await page.getByLabel('Name').fill('Preview only');
  await page.locator('form fieldset input[type="text"]').first().fill('rewe');
  await expect(status(page)).toHaveText('Match count unavailable. You can still save this category.');
  expect(createBody).toBeUndefined();

  await page.getByRole('button', { name: 'Add category' }).click();
  await expect.poll(() => createBody).toEqual({ name: 'Preview only', patterns: ['rewe'] });
});
