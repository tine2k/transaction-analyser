// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Manual category assignments, exercised through the built server against the
// disposable database. A transaction whose category was chosen by hand carries a
// lock that every rule-driven re-evaluation respects, deleting its category clears
// the lock, and the write operation sets and clears the lock for one or many
// transactions as a single all-or-nothing unit.
//
// See openspec/changes/add-manual-category-assignment/specs/manual-category-assignment/spec.md

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const fixtures = await readFile(fileURLToPath(new URL('../fixtures/integration.sql', import.meta.url)), 'utf8');
const startupTimeoutMs = 15_000;

let database: pg.Pool | undefined;
let serverProcess: ChildProcess | undefined;
let baseUrl: string;

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
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

async function waitForServer(child: ChildProcess, url: string, output: () => string): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`test server exited before becoming ready:\n${output()}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`test server did not become ready within ${startupTimeoutMs}ms:\n${output()}`);
}

async function startServer(databaseUrl: string): Promise<{ child: ChildProcess; url: string }> {
  const port = await availablePort();
  let output = '';
  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      HOST: '127.0.0.1',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(child, url, () => output);
  return { child, url };
}

function connection(): pg.Pool {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  return database;
}

async function resetFixtures(): Promise<void> {
  await connection().query('TRUNCATE TABLE transactions, categories, import_runs RESTART IDENTITY CASCADE');
  await connection().query(fixtures);
}

function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

function post(path: string, body: unknown): Promise<Response> {
  return request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function insertCategory(name: string, patterns: string[]): Promise<void> {
  await connection().query('INSERT INTO categories (name, patterns) VALUES ($1, $2)', [name, patterns]);
}

async function insertTransaction(purpose: string, counterpartyName: string): Promise<void> {
  await connection().query(
    `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id)
     VALUES ('2026-03-01', '2026-03-01', -1.00, $1, $2, NULL, NULL)`,
    [purpose, counterpartyName],
  );
}

// Seeding the lock directly in SQL, because the write endpoint arrives in a later
// task of this change and the rule-driven statements must respect the lock even
// when it was set by any means.
async function setManualCategory(purpose: string, categoryName: string): Promise<void> {
  const updated = await connection().query(
    `UPDATE transactions
     SET category_id = (SELECT id FROM categories WHERE name = $2), category_locked = true
     WHERE purpose = $1`,
    [purpose, categoryName],
  );
  if (updated.rowCount !== 1) {
    throw new Error(`expected one transaction named '${purpose}'`);
  }
}

async function manualState(purpose: string): Promise<{ category: string | null; locked: boolean }> {
  const result = await connection().query(
    `SELECT c.name AS category, t.category_locked AS locked
     FROM transactions AS t
     LEFT JOIN categories AS c ON c.id = t.category_id
     WHERE t.purpose = $1`,
    [purpose],
  );
  const row = result.rows[0] as { category: string | null; locked: boolean } | undefined;
  if (row === undefined) {
    throw new Error(`no transaction named '${purpose}'`);
  }
  return { category: row.category, locked: row.locked };
}

function assign(transactionIds: string[], categoryId: string | null): Promise<Response> {
  return post('/api/transactions/category-assignments', { transactionIds, categoryId });
}

async function storageSnapshot(): Promise<{ transactions: unknown[]; categories: unknown[] }> {
  const transactions = await connection().query(
    'SELECT id, category_id::text AS category_id, category_locked FROM transactions ORDER BY id',
  );
  const categories = await connection().query(
    'SELECT id, name, patterns, hidden, windows FROM categories ORDER BY id',
  );
  return { transactions: transactions.rows, categories: categories.rows };
}

describe('manual category assignment integration', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }

    database = new pg.Pool({ connectionString: testDatabaseUrl });
    const started = await startServer(testDatabaseUrl);
    serverProcess = started.child;
    baseUrl = started.url;
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

  it('a category create does not displace a manual assignment', async () => {
    await setManualCategory('Bookshop', 'Transport');

    const created = await post('/api/categories', { name: 'Acme', patterns: ['bookshop'] });

    expect(created.status).toBe(201);
    expect(await manualState('Bookshop')).toEqual({ category: 'Transport', locked: true });
  });

  it('a category edit does not displace a manual assignment', async () => {
    await setManualCategory('REWE Market', 'Transport');

    const edited = await request('/api/categories/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Groceries', patterns: ['rewe', 'market'] }),
    });

    expect(edited.status).toBe(200);
    expect(await manualState('REWE Market')).toEqual({ category: 'Transport', locked: true });
  });

  it('a pattern append re-evaluates unpinned matches but not a manual assignment', async () => {
    await setManualCategory('Bookshop', 'Transport');
    await insertTransaction('Bookshop Refund', 'Books');

    const appended = await post('/api/categories/1/patterns', { text: 'Bookshop' });

    expect(appended.status).toBe(200);
    expect(await manualState('Bookshop')).toEqual({ category: 'Transport', locked: true });
    expect(await manualState('Bookshop Refund')).toEqual({ category: 'Groceries', locked: false });
  });

  it('the re-categorisation leaves a manual assignment untouched and uncounted', async () => {
    await setManualCategory('REWE Market', 'Transport');
    await insertCategory('Acme', ['bookshop']);

    const response = await request('/api/categories/recategorise', { method: 'POST' });

    expect(response.status).toBe(200);
    expect(((await response.json()) as { changed: number }).changed).toBe(1);
    expect(await manualState('REWE Market')).toEqual({ category: 'Transport', locked: true });
    expect(await manualState('Bookshop')).toEqual({ category: 'Acme', locked: false });
  });

  it('deleting a category clears the manual assignment and leaves no stale reference', async () => {
    await setManualCategory('REWE Market', 'Transport');

    const deleted = await request('/api/categories/2', { method: 'DELETE' });

    expect(deleted.status).toBe(204);
    expect(await manualState('REWE Market')).toEqual({ category: 'Groceries', locked: false });
  });

  it('pins one transaction to a stored category', async () => {
    const response = await assign(['1'], '2');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 1 });
    expect(await manualState('REWE Market')).toEqual({ category: 'Transport', locked: true });
  });

  it('pins several transactions in one request and reports the count', async () => {
    const response = await assign(['1', '2', '4'], '1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 3 });
    expect(await manualState('REWE Market')).toEqual({ category: 'Groceries', locked: true });
    expect(await manualState('Rail ticket')).toEqual({ category: 'Groceries', locked: true });
    expect(await manualState('Bookshop')).toEqual({ category: 'Groceries', locked: true });
  });

  it('assigns and counts a repeated identity once', async () => {
    const response = await assign(['4', '4'], '1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 1 });
    expect(await manualState('Bookshop')).toEqual({ category: 'Groceries', locked: true });
  });

  it('clearing re-evaluates the named transactions immediately', async () => {
    await setManualCategory('REWE Market', 'Transport');
    await setManualCategory('Bookshop', 'Transport');

    const response = await assign(['1', '4'], null);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 2 });
    expect(await manualState('REWE Market')).toEqual({ category: 'Groceries', locked: false });
    expect(await manualState('Bookshop')).toEqual({ category: null, locked: false });
  });

  it('refuses an empty identity list without changing anything', async () => {
    const before = await storageSnapshot();

    const response = await assign([], '1');

    expect(response.status).toBe(400);
    assert.deepEqual(await storageSnapshot(), before);
  });

  it('refuses a malformed identity without changing anything', async () => {
    const before = await storageSnapshot();

    const response = await assign(['1', 'not-a-number'], '1');

    expect(response.status).toBe(400);
    assert.deepEqual(await storageSnapshot(), before);
  });

  it('refuses an unknown transaction without changing anything', async () => {
    const before = await storageSnapshot();

    const response = await assign(['1', '999'], '1');

    expect(response.status).toBe(404);
    assert.deepEqual(await storageSnapshot(), before);
  });

  it('refuses an unknown category without changing anything', async () => {
    const before = await storageSnapshot();

    const response = await assign(['1'], '999');

    expect(response.status).toBe(404);
    assert.deepEqual(await storageSnapshot(), before);
  });

  it('writes no category when it assigns', async () => {
    const before = await storageSnapshot();

    const response = await assign(['1', '2'], '1');

    expect(response.status).toBe(200);
    expect((await storageSnapshot()).categories).toEqual(before.categories);
  });

  it('an assignment racing the deletion of its category leaves no stale reference', async () => {
    const insertedCategory = await connection().query(
      "INSERT INTO categories (name, patterns) VALUES ('Acme', ARRAY['acme']) RETURNING id",
    );
    const categoryId = (insertedCategory.rows[0] as { id: string }).id;
    const insertedTransaction = await connection().query(
      `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id)
       VALUES ('2026-03-01', '2026-03-01', -2.00, 'Odd purchase', 'Acme', NULL, NULL)
       RETURNING id`,
    );
    const transactionId = (insertedTransaction.rows[0] as { id: string }).id;

    const [assigned, deleted] = await Promise.all([
      assign([transactionId], categoryId),
      request(`/api/categories/${categoryId}`, { method: 'DELETE' }),
    ]);

    expect(deleted.status).toBe(204);
    expect([200, 404]).toContain(assigned.status);
    const references = await connection().query(
      'SELECT count(*)::int AS count FROM transactions WHERE category_id = $1',
      [categoryId],
    );
    expect((references.rows[0] as { count: number }).count).toBe(0);
  });
});
