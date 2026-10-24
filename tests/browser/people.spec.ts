import { expect, test, type Page } from '@playwright/test';

// The people management screen in headless Chromium. The API is intercepted, so
// the checks exercise the rendered list, create, rename, cancel, conflict, and
// failure states, the absence of deletion, and the narrow-width layout.
//
// See openspec/changes/add-people/specs/person-management-screen/spec.md

type Person = { id: string; name: string; transactionCount: number };

type PeopleApi = {
  people: Person[];
  requests: Array<{ method: string; pathname: string; body: unknown }>;
};

function startPeople(initial: Person[] = [
  { id: '1', name: 'Default', transactionCount: 4 },
  { id: '2', name: 'Anna', transactionCount: 0 },
]): PeopleApi {
  return {
    people: initial,
    requests: [],
  };
}

async function interceptApi(page: Page, api: PeopleApi, options: { failList?: boolean } = {}): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const body = request.postData() === null ? null : request.postDataJSON();
    api.requests.push({ method, pathname, body });

    if (pathname === '/api/people' && method === 'GET') {
      if (options.failList === true) {
        await route.fulfill({ status: 500, json: { message: 'the people could not be read' } });
        return;
      }
      await route.fulfill({ json: api.people });
      return;
    }

    if (pathname === '/api/people' && method === 'POST') {
      const name = String((body as { name?: unknown }).name ?? '').trim();
      if (api.people.some((person) => person.name.toLowerCase() === name.toLowerCase())) {
        await route.fulfill({ status: 409, json: { message: 'a person with that name already exists' } });
        return;
      }
      const created = { id: String(api.people.length + 1), name, transactionCount: 0 };
      api.people.push(created);
      await route.fulfill({ status: 201, json: created });
      return;
    }

    const rename = /^\/api\/people\/([^/]+)$/.exec(pathname);
    if (rename !== null && method === 'PUT') {
      const person = api.people.find((entry) => entry.id === rename[1]);
      const name = String((body as { name?: unknown }).name ?? '').trim();
      if (person === undefined) {
        await route.fulfill({ status: 404, json: { message: 'no person carries that identity' } });
        return;
      }
      if (api.people.some((entry) => entry.id !== person.id && entry.name.toLowerCase() === name.toLowerCase())) {
        await route.fulfill({ status: 409, json: { message: 'a person with that name already exists' } });
        return;
      }
      person.name = name;
      await route.fulfill({ json: person });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'No test fixture for this endpoint' } });
  });
}

function rowNames(page: Page) {
  return page.getByTestId('person-name').allTextContents();
}

function rowCounts(page: Page) {
  return page.getByTestId('person-count').allTextContents();
}

test('lists every person with its count, including zero', async ({ page }) => {
  await interceptApi(page, startPeople());
  await page.goto('/people', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('person-row')).toHaveCount(2);
  expect(await rowNames(page)).toEqual(['Anna', 'Default']);
  expect(await rowCounts(page)).toEqual(['0', '4']);
  await expect(page).toHaveTitle('People · Expenses');
});

test('creates a person and shows the new row with a zero count', async ({ page }) => {
  const api = startPeople();
  await interceptApi(page, api);
  await page.goto('/people', { waitUntil: 'networkidle' });

  await page.getByTestId('person-name-input').fill('  Zoe  ');
  await page.getByTestId('person-submit').click();

  await expect(page.getByTestId('person-row')).toHaveCount(3);
  expect(await rowNames(page)).toEqual(['Anna', 'Default', 'Zoe']);
  expect(await rowCounts(page)).toEqual(['0', '4', '0']);
  expect(api.requests).toContainEqual({
    method: 'POST',
    pathname: '/api/people',
    body: { name: 'Zoe' },
  });
});

test('renames a person in place and keeps its count', async ({ page }) => {
  const api = startPeople();
  await interceptApi(page, api);
  await page.goto('/people', { waitUntil: 'networkidle' });

  await page.locator('[data-person-id="1"]').getByTestId('person-edit').click();
  await expect(page.getByTestId('person-name-input')).toHaveValue('Default');
  await page.getByTestId('person-name-input').fill('Household');
  await page.getByTestId('person-submit').click();

  await expect(page.locator('[data-person-id="1"] [data-testid="person-name"]')).toHaveText('Household');
  await expect(page.locator('[data-person-id="1"] [data-testid="person-count"]')).toHaveText('4');
  await expect(page.getByTestId('person-name-input')).toHaveValue('');
});

test('cancelling a rename changes nothing', async ({ page }) => {
  const api = startPeople();
  await interceptApi(page, api);
  await page.goto('/people', { waitUntil: 'networkidle' });

  await page.locator('[data-person-id="2"]').getByTestId('person-edit').click();
  await page.getByTestId('person-name-input').fill('Someone else');
  await page.getByTestId('person-cancel').click();

  expect(await rowNames(page)).toEqual(['Anna', 'Default']);
  expect(api.requests.some((request) => request.method === 'PUT')).toBe(false);
});

test('a duplicate name is reported and adds no row', async ({ page }) => {
  await interceptApi(page, startPeople());
  await page.goto('/people', { waitUntil: 'networkidle' });

  await page.getByTestId('person-name-input').fill('anna');
  await page.getByTestId('person-submit').click();

  await expect(page.getByTestId('person-form-error')).toContainText('already exists');
  await expect(page.getByTestId('person-row')).toHaveCount(2);
});

test('a failed load is not shown as an empty list', async ({ page }) => {
  await interceptApi(page, startPeople(), { failList: true });
  await page.goto('/people', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('people-error')).toContainText('could not be loaded');
  await expect(page.getByTestId('people-empty')).toHaveCount(0);
});

test('offers no way to delete a person', async ({ page }) => {
  await interceptApi(page, startPeople());
  await page.goto('/people', { waitUntil: 'networkidle' });

  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  expect(await rowNames(page)).toEqual(['Anna', 'Default']);
});

test.describe('narrow viewport', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('keeps the form and every person row usable without page overflow', async ({ page }) => {
    await interceptApi(page, startPeople());
    await page.goto('/people', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('person-name-input')).toBeVisible();
    await expect(page.getByTestId('person-row')).toHaveCount(2);

    const region = page.getByRole('region', { name: 'People table' });
    await expect(region).toBeVisible();
    await expect.poll(() => region.evaluate((element) => element.scrollWidth > element.clientWidth))
      .toBe(true);

    await page.mouse.move(1, 1);
    await page.mouse.wheel(1000, 0);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);

    const shortControls = await page.locator('button:visible, input:visible').evaluateAll((elements) =>
      elements.filter((element) => element.getBoundingClientRect().height < 44).length);
    expect(shortControls).toBe(0);
  });
});
