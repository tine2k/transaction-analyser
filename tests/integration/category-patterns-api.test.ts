// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// The append endpoint and the literal match-count preview, exercised through the
// built server against the disposable database. The append must store the text
// as a literal, leave the rest of the category alone, re-evaluate transactions
// only when it actually adds a pattern, and survive concurrent tabs.
//
// See openspec/changes/add-transaction-pattern-shortcut/specs/category-management-api/spec.md

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
    server.close((error) => (error ? reject(error) : resolve()));
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
  await database.query('TRUNCATE TABLE transactions, categories, import_runs RESTART IDENTITY CASCADE');
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

function post(path: string, body: unknown): Promise<Response> {
  return request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function append(id: string, text: unknown): Promise<Response> {
  return post(`/api/categories/${id}/patterns`, { text });
}

async function categories(): Promise<Array<{ id: string; name: string; patterns: string[]; hidden: boolean; windows: Array<{ from: string; to: string }> }>> {
  return request('/api/categories').then((result) => result.json());
}

async function insertTransaction(purpose: string, counterpartyName = 'Test'): Promise<void> {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  await database.query(
    `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account)
     VALUES ('2026-03-01', '2026-03-01', -1.00, $1, $2, NULL)`,
    [purpose, counterpartyName],
  );
}

describe('category pattern append API integration', () => {
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

  it('appends a literal pattern and reports that it was added', async () => {
    const response = await append('1', 'organic');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      category: { id: '1', name: 'Groceries', patterns: ['rewe', 'market', 'organic'], hidden: false, windows: [] },
      added: true,
    });
  });

  it('stores the text literally and re-evaluates matching transactions', async () => {
    await insertTransaction('Pay a+b(c) now');
    await insertTransaction('Pay aabc now');

    const response = await append('1', 'a+b(c)');
    expect(response.status).toBe(200);
    expect((await response.json()).category.patterns).toEqual(['rewe', 'market', 'a\\+b\\(c\\)']);

    const transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { id: string } | null;
    }>;
    const byPurpose = Object.fromEntries(transactions.map((transaction) => [transaction.purpose, transaction.category]));

    expect(byPurpose['Pay a+b(c) now']).toMatchObject({ id: '1' });
    expect(byPurpose['Pay aabc now']).toBeNull();
  });

  it('leaves the name, hidden flag, windows, and other patterns unchanged', async () => {
    const created = await post('/api/categories', {
      name: 'Urlaub',
      patterns: ['urlaub'],
      hidden: true,
      windows: [{ from: '2026-07-01', to: '2026-07-14' }],
    });
    expect(created.status).toBe(201);
    const id = (await created.json()).id as string;

    const response = await append(id, 'strand');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      category: {
        id,
        name: 'Urlaub',
        patterns: ['urlaub', 'strand'],
        hidden: true,
        windows: [{ from: '2026-07-01', to: '2026-07-14' }],
      },
      added: true,
    });
  });

  it('reports an already-stored pattern without changing anything', async () => {
    const before = await storedRows();
    const response = await append('1', 'market');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      category: { id: '1', name: 'Groceries', patterns: ['rewe', 'market'], hidden: false, windows: [] },
      added: false,
    });
    assert.deepEqual(await storedRows(), before);
  });

  it('trims surrounding whitespace before storing', async () => {
    const response = await append('1', '  bio  ');

    expect(response.status).toBe(200);
    expect((await response.json()).category.patterns).toEqual(['rewe', 'market', 'bio']);
  });

  it('refuses a missing, non-string, or short text without changing stored data', async () => {
    const before = await storedRows();
    const bodies = [
      {},
      { text: 12 },
      { text: ['market'] },
      { text: ' ab ' },
      { text: '' },
      { text: 'x' },
    ];

    for (const body of bodies) {
      const response = await post('/api/categories/1/patterns', body);
      expect(response.status).toBe(400);
    }

    assert.deepEqual(await storedRows(), before);
  });

  it('answers an unknown identity as a client error', async () => {
    const before = await storedRows();
    const missing = await append('999', 'valid text');
    expect(missing.status).toBe(404);

    const malformed = await append('not-an-identity', 'valid text');
    expect(malformed.status).toBe(404);

    assert.deepEqual(await storedRows(), before);
  });

  it('stores both patterns when two appends to the same category run concurrently', async () => {
    const [first, second] = await Promise.all([
      append('1', 'alpha'),
      append('1', 'beta'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const stored = (await categories()).find((category) => category.id === '1');
    expect(stored?.patterns).toEqual(['rewe', 'market', 'alpha', 'beta']);
  });

  it('previews the number of transactions a literal text matches', async () => {
    const before = await storedRows();
    const response = await post('/api/categories/literal-match-count', { text: 'market' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    assert.deepEqual(await storedRows(), before);
  });

  it('matches case-insensitively and once per transaction', async () => {
    await insertTransaction('market market');

    const response = await post('/api/categories/literal-match-count', { text: 'MARKET' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 2 });
  });

  it('matches metacharacters literally rather than as operators', async () => {
    await insertTransaction('Pay a+b(c) now');
    await insertTransaction('Pay aabc now');

    const response = await post('/api/categories/literal-match-count', { text: 'a+b(c)' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
  });

  it('refuses an invalid preview text without changing stored data', async () => {
    const before = await storedRows();
    const bodies = [{}, { text: 12 }, { text: ' ab ' }];

    for (const body of bodies) {
      const response = await post('/api/categories/literal-match-count', body);
      expect(response.status).toBe(400);
    }

    assert.deepEqual(await storedRows(), before);
  });

  it('assigns a transaction whose counterparty name matches when its purpose does not', async () => {
    await insertTransaction('Purchase', 'ACME Books');

    const created = await post('/api/categories', { name: 'Reading', patterns: ['acme'] });
    expect(created.status).toBe(201);

    const transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { name: string } | null;
    }>;
    expect(transactions.find((transaction) => transaction.purpose === 'Purchase')?.category)
      .toMatchObject({ name: 'Reading' });
  });

  it('re-evaluates a transaction when an edited expression matches only its counterparty name', async () => {
    await insertTransaction('Purchase', 'ACME Books');

    const edited = await request('/api/categories/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Groceries', patterns: ['rewe', 'market', 'acme'] }),
    });
    expect(edited.status).toBe(200);

    const transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { name: string } | null;
    }>;
    expect(transactions.find((transaction) => transaction.purpose === 'Purchase')?.category)
      .toMatchObject({ name: 'Groceries' });
  });

  it('counts a counterparty-name match in the expression preview', async () => {
    await insertTransaction('Purchase', 'ACME Books');

    const response = await post('/api/categories/match-count', { patterns: ['acme'] });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
  });

  it('counts a counterparty-name match in the literal preview', async () => {
    await insertTransaction('Purchase', 'ACME Books');

    const response = await post('/api/categories/literal-match-count', { text: 'acme' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
  });

  it('excludes a counterparty-name match from the window-claim preview', async () => {
    await insertTransaction('Purchase', 'ACME Books');
    const created = await post('/api/categories', { name: 'Acme', patterns: ['acme'] });
    expect(created.status).toBe(201);

    const response = await post('/api/categories/window-match-count', {
      windows: [{ from: '2026-03-01', to: '2026-03-01' }],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 0 });
  });
});
