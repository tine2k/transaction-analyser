// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const fixtures = await readFile(fileURLToPath(new URL('../fixtures/integration.sql', import.meta.url)), 'utf8');
const startupTimeoutMs = 15_000;

let database: pg.Pool | undefined;
let serverProcess: ChildProcess | undefined;
let baseUrl: string;
let serverOutput = '';

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('could not allocate a local test port');
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return address.port;
}

async function waitForServer(child: ChildProcess): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`test server exited before becoming ready:\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`test server did not become ready within ${startupTimeoutMs}ms:\n${serverOutput}`);
}

async function resetFixtures(): Promise<void> {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  await database.query('TRUNCATE TABLE transactions, categories RESTART IDENTITY CASCADE');
  await database.query(fixtures);
}

async function storedRows(): Promise<{ transactions: unknown[]; categories: unknown[] }> {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  const transactions = await database.query(`
    SELECT id, booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id
    FROM transactions ORDER BY id
  `);
  const categories = await database.query('SELECT id, name, patterns, hidden, windows FROM categories ORDER BY id');
  return { transactions: transactions.rows, categories: categories.rows };
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

describe('API integration', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }

    database = new pg.Pool({ connectionString: testDatabaseUrl });
    const port = await availablePort();
    baseUrl = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, ['.output/server/index.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
        HOST: '127.0.0.1',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProcess.stdout?.on('data', (chunk: Buffer) => { serverOutput += chunk.toString(); });
    serverProcess.stderr?.on('data', (chunk: Buffer) => { serverOutput += chunk.toString(); });
    await waitForServer(serverProcess);
  }, 30_000);

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    if (serverProcess !== undefined && serverProcess.exitCode === null && serverProcess.signalCode === null) {
      const exited = once(serverProcess, 'exit');
      serverProcess.kill('SIGTERM');
      await exited;
    }
    await database?.end();
  });

  it('returns transactions in stable order with the API response shape', async () => {
    const response = await request('/api/transactions');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: '3',
        bookingDate: '2026-02-05',
        valueDate: '2026-02-05',
        amount: '-9.99',
        purpose: 'Internal transfer',
        counterpartyName: 'Own account',
        counterpartyAccount: null,
        category: { id: '3', name: 'Internal', hidden: true },
      },
      {
        id: '2',
        bookingDate: '2026-02-04',
        valueDate: '2026-02-03',
        amount: '-4.80',
        purpose: 'Rail ticket',
        counterpartyName: 'Transit',
        counterpartyAccount: 'DE00000000000000000000',
        category: { id: '2', name: 'Transport', hidden: false },
      },
      {
        id: '1',
        bookingDate: '2026-02-03',
        valueDate: '2026-02-03',
        amount: '-12.50',
        purpose: 'REWE Market',
        counterpartyName: 'REWE',
        counterpartyAccount: null,
        category: { id: '1', name: 'Groceries', hidden: false },
      },
      {
        id: '4',
        bookingDate: '2026-02-01',
        valueDate: '2026-02-01',
        amount: '-8.20',
        purpose: 'Bookshop',
        counterpartyName: 'Books',
        counterpartyAccount: null,
        category: null,
      },
    ]);
  });

  it('persists a created category and assigns matching transactions', async () => {
    const response = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Reading', patterns: ['bookshop'] }),
    });

    expect(response.status).toBe(201);
    expect(await response.json())
      .toEqual({ id: '4', name: 'Reading', patterns: ['bookshop'], hidden: false, windows: [] });
    const transactions = await request('/api/transactions').then((result) => result.json());
    expect(transactions.find((transaction: { purpose: string }) => transaction.purpose === 'Bookshop').category)
      .toEqual({ id: '4', name: 'Reading', hidden: false });
  });

  it('stores, lists, and toggles the hidden flag without changing transactions', async () => {
    const before = await storedRows();
    const created = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Internal 2', patterns: ['internal'], hidden: true }),
    });
    expect(created.status).toBe(201);
    expect(await created.json())
      .toEqual({ id: '4', name: 'Internal 2', patterns: ['internal'], hidden: true, windows: [] });

    const listed = await request('/api/categories').then((result) => result.json());
    expect(listed.find((category: { name: string }) => category.name === 'Internal 2').hidden).toBe(true);

    const edited = await request('/api/categories/4', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Internal 2', patterns: ['internal'], hidden: false }),
    });
    expect(edited.status).toBe(200);
    expect(await edited.json())
      .toEqual({ id: '4', name: 'Internal 2', patterns: ['internal'], hidden: false, windows: [] });

    const after = await storedRows();
    expect(after.transactions).toEqual(before.transactions);
  });

  it('defaults an omitted hidden flag to visible', async () => {
    const response = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Visible default', patterns: ['bookshop'] }),
    });

    expect(response.status).toBe(201);
    expect(await response.json())
      .toEqual({ id: '4', name: 'Visible default', patterns: ['bookshop'], hidden: false, windows: [] });
  });

  it('rejects a non-boolean hidden flag without changing stored data', async () => {
    const before = await storedRows();
    const response = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bad flag', patterns: ['bookshop'], hidden: 'yes' }),
    });

    expect(response.status).toBe(400);
    expect(await storedRows()).toEqual(before);
  });

  it('follows a hidden flag change through the transaction category reference', async () => {
    const hiddenTransaction = () => request('/api/transactions').then((result) => result.json())
      .then((transactions: Array<{ purpose: string; category: { hidden: boolean } | null }>) =>
        transactions.find((transaction) => transaction.purpose === 'REWE Market')?.category?.hidden);

    expect(await hiddenTransaction()).toBe(false);
    await request('/api/categories/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Groceries', patterns: ['rewe', 'market'], hidden: true }),
    });
    expect(await hiddenTransaction()).toBe(true);
  });

  it('rejects an invalid category expression without changing stored data', async () => {
    const before = await storedRows();
    const response = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Broken expression', patterns: ['['] }),
    });

    expect(response.status).toBe(400);
    expect(await storedRows()).toEqual(before);
  });

  it('counts matching transactions once and leaves all stored data unchanged', async () => {
    const before = await storedRows();
    const response = await request('/api/categories/match-count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patterns: ['rewe', 'market'] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    assert.deepEqual(await storedRows(), before);
  });

  it('stores date windows in order and accepts a date-only category', async () => {
    const created = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Urlaub',
        patterns: [],
        windows: [
          { from: '2026-07-01', to: '2026-07-14' },
          { from: '2026-08-01', to: '2026-08-14' },
        ],
      }),
    });

    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({
      id: '4',
      name: 'Urlaub',
      patterns: [],
      hidden: false,
      windows: [
        { from: '2026-07-01', to: '2026-07-14' },
        { from: '2026-08-01', to: '2026-08-14' },
      ],
    });
  });

  it('defaults an omitted window list to none', async () => {
    const response = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'No windows', patterns: ['bookshop'] }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: '4',
      name: 'No windows',
      patterns: ['bookshop'],
      hidden: false,
      windows: [],
    });
  });

  it('rejects malformed, impossible, and reversed window dates without changing stored data', async () => {
    const before = await storedRows();
    const cases = [
      { from: '2026-07-01T00:00:00', to: '2026-07-14' },
      { from: '2026-02-30', to: '2026-03-01' },
      { from: '2026-07-14', to: '2026-07-01' },
      { from: '2026-07-01' },
    ];

    for (const [index, window] of cases.entries()) {
      const response = await request('/api/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: `Bad window ${index}`, patterns: ['bookshop'], windows: [window] }),
      });
      expect(response.status).toBe(400);
    }

    expect(await storedRows()).toEqual(before);
  });

  it('rejects overlapping windows and accepts adjacent ones', async () => {
    const first = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Urlaub', patterns: [], windows: [{ from: '2026-07-01', to: '2026-07-14' }] }),
    });
    expect(first.status).toBe(201);
    const firstId = (await first.json()).id as string;

    const overlapping = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Trip', patterns: [], windows: [{ from: '2026-07-01', to: '2026-07-10' }] }),
    });
    expect(overlapping.status).toBe(400);

    const sharedEndpoint = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Trip', patterns: [], windows: [{ from: '2026-07-14', to: '2026-07-28' }] }),
    });
    expect(sharedEndpoint.status).toBe(400);

    const withinCandidateSet = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Trip',
        patterns: [],
        windows: [
          { from: '2026-09-01', to: '2026-09-10' },
          { from: '2026-09-05', to: '2026-09-15' },
        ],
      }),
    });
    expect(withinCandidateSet.status).toBe(400);

    const adjacent = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Trip', patterns: [], windows: [{ from: '2026-07-15', to: '2026-07-28' }] }),
    });
    expect(adjacent.status).toBe(201);

    const keepsOwnWindow = await request(`/api/categories/${firstId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Urlaub', patterns: [], windows: [{ from: '2026-07-01', to: '2026-07-14' }] }),
    });
    expect(keepsOwnWindow.status).toBe(200);
  });

  it('rejects a category with neither an expression nor a window', async () => {
    const before = await storedRows();
    const response = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Empty', patterns: [], windows: [] }),
    });

    expect(response.status).toBe(400);
    expect(await storedRows()).toEqual(before);
  });

  it('assigns an expression match before a covering window', async () => {
    const created = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Urlaub', patterns: [], windows: [{ from: '2026-02-01', to: '2026-02-05' }] }),
    });
    expect(created.status).toBe(201);

    const transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { id: string; name: string } | null;
    }>;
    const byPurpose = Object.fromEntries(
      transactions.map((transaction) => [transaction.purpose, transaction.category]),
    );

    expect(byPurpose['REWE Market']).toMatchObject({ id: '1', name: 'Groceries' });
    expect(byPurpose['Rail ticket']).toMatchObject({ id: '2', name: 'Transport' });
    expect(byPurpose['Internal transfer']).toMatchObject({ id: '3', name: 'Internal' });
    expect(byPurpose['Bookshop']).toMatchObject({ id: '4', name: 'Urlaub' });
  });

  it('covers a transaction by a window on each inclusive endpoint and drops it outside', async () => {
    const created = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Urlaub', patterns: [], windows: [{ from: '2026-02-01', to: '2026-02-01' }] }),
    });
    expect(created.status).toBe(201);
    const id = (await created.json()).id as string;
    const bookshopCategory = () =>
      request('/api/transactions').then((result) => result.json())
        .then((transactions: Array<{ purpose: string; category: { id: string; name: string } | null }>) =>
          transactions.find((transaction) => transaction.purpose === 'Bookshop')?.category);

    // 2026-02-01 is both the from and the to endpoint of the window and is covered.
    expect(await bookshopCategory()).toMatchObject({ id, name: 'Urlaub' });

    // A window whose to endpoint is still 2026-02-01 keeps covering it.
    const onToEndpoint = await request(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Urlaub', patterns: [], windows: [{ from: '2026-01-31', to: '2026-02-01' }] }),
    });
    expect(onToEndpoint.status).toBe(200);
    expect(await bookshopCategory()).toMatchObject({ id, name: 'Urlaub' });

    // A window entirely after the booking date leaves it uncategorised.
    const outside = await request(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Urlaub', patterns: [], windows: [{ from: '2026-02-02', to: '2026-02-03' }] }),
    });
    expect(outside.status).toBe(200);
    expect(await bookshopCategory()).toBeNull();
  });

  it('does not decide a window by the value date', async () => {
    // Rail ticket's booking date is 2026-02-04 and its value date is 2026-02-03.
    // Remove its expression so only a window could categorise it.
    const edited = await request('/api/categories/2', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Transport', patterns: ['zzzz'], hidden: false }),
    });
    expect(edited.status).toBe(200);

    const created = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Vacation', patterns: [], windows: [{ from: '2026-02-03', to: '2026-02-03' }] }),
    });
    expect(created.status).toBe(201);

    const rail = await request('/api/transactions').then((result) => result.json())
      .then((transactions: Array<{ purpose: string; category: unknown }>) =>
        transactions.find((transaction) => transaction.purpose === 'Rail ticket')?.category);
    expect(rail).toBeNull();
  });

  it('assigns the smallest identity when stored windows overlap', async () => {
    // The surface refuses overlaps, so store two overlapping windows directly to
    // exercise the deterministic tie-break the recompute keeps as a fallback.
    await database?.query(
      `INSERT INTO categories (name, patterns, hidden, windows) VALUES
         ('Overlap small', ARRAY[]::text[], false, $1::jsonb),
         ('Overlap large', ARRAY[]::text[], false, $2::jsonb)`,
      [
        JSON.stringify([{ from: '2026-02-01', to: '2026-02-05' }]),
        JSON.stringify([{ from: '2026-02-01', to: '2026-02-05' }]),
      ],
    );

    // Any category change re-evaluates every transaction, including these rows.
    const trigger = await request('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Trigger', patterns: [], windows: [{ from: '2026-12-01', to: '2026-12-02' }] }),
    });
    expect(trigger.status).toBe(201);

    const bookshop = await request('/api/transactions').then((result) => result.json())
      .then((transactions: Array<{ purpose: string; category: { id: string; name: string } | null }>) =>
        transactions.find((transaction) => transaction.purpose === 'Bookshop')?.category);
    expect(bookshop).toMatchObject({ id: '4', name: 'Overlap small' });
  });

  it('previews the transactions a window claims, excluding those an expression matches', async () => {
    const before = await storedRows();
    const response = await request('/api/categories/window-match-count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ windows: [{ from: '2026-02-01', to: '2026-02-05' }] }),
    });

    expect(response.status).toBe(200);
    // REWE Market, Rail ticket, and Internal transfer are claimed by a stored
    // expression; only Bookshop is left for the window to claim.
    expect(await response.json()).toEqual({ count: 1 });
    assert.deepEqual(await storedRows(), before);
  });

  it('counts a window inclusively on both endpoints and ignores the value date', async () => {
    // Remove the transport expression so Rail ticket (booking 2026-02-04, value
    // 2026-02-03) can only be claimed by a window.
    await request('/api/categories/2', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Transport', patterns: ['zzzz'], hidden: false }),
    });

    const count = (windows: Array<{ from: string; to: string }>) =>
      request('/api/categories/window-match-count', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ windows }),
      }).then((result) => result.json()).then((body: { count: number }) => body.count);

    // Bookshop is on 2026-02-01; a window whose from or to endpoint is that day counts it.
    expect(await count([{ from: '2026-02-01', to: '2026-02-01' }])).toBe(1);
    expect(await count([{ from: '2026-01-31', to: '2026-02-01' }])).toBe(1);
    // A window that covers the value date but not the booking date does not count it.
    expect(await count([{ from: '2026-02-03', to: '2026-02-03' }])).toBe(0);
    // The booking date itself does decide it.
    expect(await count([{ from: '2026-02-04', to: '2026-02-04' }])).toBe(1);
  });

  it('counts each transaction once across several windows, including overlapping ones', async () => {
    const before = await storedRows();
    const response = await request('/api/categories/window-match-count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        windows: [
          { from: '2026-01-31', to: '2026-02-01' },
          { from: '2026-02-01', to: '2026-02-02' },
          { from: '2026-02-01', to: '2026-02-05' },
        ],
      }),
    });

    // Only Bookshop is unclaimed; three covering windows still count it once.
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    assert.deepEqual(await storedRows(), before);
  });

  it('rejects a missing, empty, or malformed window list without changing stored data', async () => {
    const before = await storedRows();
    const bodies = [
      {},
      { windows: [] },
      { windows: 'nope' },
      { windows: [null] },
      { windows: [{ from: '2026-02-01', to: '2026-02-05', extra: true }] },
      { windows: [{ from: '2026-02-01T00:00:00', to: '2026-02-05' }] },
      { windows: [{ from: '2026-02-30', to: '2026-03-01' }] },
      { windows: [{ from: '2026-02-05', to: '2026-02-01' }] },
      { windows: [{ from: '2026-02-01' }] },
    ];

    for (const body of bodies) {
      const response = await request('/api/categories/window-match-count', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }

    assert.deepEqual(await storedRows(), before);
  });
});
