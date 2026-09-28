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
  const categories = await database.query('SELECT id, name, patterns, hidden FROM categories ORDER BY id');
  return { transactions: transactions.rows, categories: categories.rows };
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

describe('API integration', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite through tests/run-with-test-database.sh to set TEST_DATABASE_URL.');
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
      .toEqual({ id: '4', name: 'Reading', patterns: ['bookshop'], hidden: false });
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
      .toEqual({ id: '4', name: 'Internal 2', patterns: ['internal'], hidden: true });

    const listed = await request('/api/categories').then((result) => result.json());
    expect(listed.find((category: { name: string }) => category.name === 'Internal 2').hidden).toBe(true);

    const edited = await request('/api/categories/4', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Internal 2', patterns: ['internal'], hidden: false }),
    });
    expect(edited.status).toBe(200);
    expect(await edited.json())
      .toEqual({ id: '4', name: 'Internal 2', patterns: ['internal'], hidden: false });

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
      .toEqual({ id: '4', name: 'Visible default', patterns: ['bookshop'], hidden: false });
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
});
