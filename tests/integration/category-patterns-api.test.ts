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
  const categories = await database.query('SELECT id, name, patterns, hidden, windows, expense_type FROM categories ORDER BY id');
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

async function categories(): Promise<Array<{ id: string; name: string; patterns: string[]; hidden: boolean; windows: Array<{ from: string; to: string }>; expenseType: 'recurring' | 'one-time' | null }>> {
  return request('/api/categories').then((result) => result.json());
}

async function insertTransaction(purpose: string, counterpartyName = 'Test'): Promise<void> {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  await database.query(
    `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, person_id)
     VALUES ('2026-03-01', '2026-03-01', -1.00, $1, $2, NULL, (SELECT id FROM people WHERE name = 'Default'))`,
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
        EASYBANK_PERSON: 'Default',
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
      category: { id: '1', name: 'Groceries', patterns: ['rewe', 'market', 'organic'], hidden: false, windows: [], expenseType: null },
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

  it('re-evaluates matching transactions and leaves a non-matching transaction unchanged', async () => {
    if (database === undefined) {
      throw new Error('test database is not initialized');
    }
    await database.query(
      `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id, person_id)
       VALUES ('2026-03-01', '2026-03-01', -2.00, 'Bookshop Special', 'Books', NULL, 2, (SELECT id FROM people WHERE name = 'Default'))`,
    );
    await insertTransaction('Zzz special vendor');

    const response = await append('1', 'Zzz special vendor');
    expect(response.status).toBe(200);
    expect((await response.json()).added).toBe(true);

    const transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { id: string } | null;
    }>;
    const byPurpose = Object.fromEntries(transactions.map((transaction) => [transaction.purpose, transaction.category]));

    expect(byPurpose['Zzz special vendor']).toMatchObject({ id: '1' });
    expect(byPurpose['Bookshop Special']).toMatchObject({ id: '2' });
  });

  it('applies the full rule to matching transactions: expression beats window and the smallest identity wins', async () => {
    if (database === undefined) {
      throw new Error('test database is not initialized');
    }
    await database.query(
      `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, person_id)
       VALUES ('2026-04-15', '2026-04-15', -3.00, 'Window special', 'Test', NULL, (SELECT id FROM people WHERE name = 'Default'))`,
    );

    const windowCategory = await post('/api/categories', {
      name: 'Holiday',
      windows: [{ from: '2026-04-01', to: '2026-04-30' }],
    });
    expect(windowCategory.status).toBe(201);

    let transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { id: string; name: string } | null;
    }>;
    expect(transactions.find((transaction) => transaction.purpose === 'Window special')?.category)
      .toMatchObject({ name: 'Holiday' });

    const appended = await append('1', 'Window special');
    expect(appended.status).toBe(200);

    await insertTransaction('base pattern plus extra');
    const laterCategory = await post('/api/categories', { name: 'Later', patterns: ['base pattern'] });
    expect(laterCategory.status).toBe(201);

    const secondAppend = await append('1', 'extra');
    expect(secondAppend.status).toBe(200);

    transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: { id: string } | null;
    }>;
    const byPurpose = Object.fromEntries(transactions.map((transaction) => [transaction.purpose, transaction.category]));

    expect(byPurpose['Window special']).toMatchObject({ id: '1' });
    expect(byPurpose['base pattern plus extra']).toMatchObject({ id: '1' });
  });

  it('rolls back the append and the re-evaluation together when the re-evaluation fails', async () => {
    if (database === undefined) {
      throw new Error('test database is not initialized');
    }
    await insertTransaction('Atomic rollback target');
    await database.query(`
      CREATE OR REPLACE FUNCTION test_block_target_update() RETURNS trigger AS $$
      BEGIN
        IF NEW.purpose = 'Atomic rollback target' THEN
          RAISE EXCEPTION 'blocked by test trigger';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_block_target_update
        BEFORE UPDATE ON transactions
        FOR EACH ROW EXECUTE FUNCTION test_block_target_update();
    `);

    let response: Response | undefined;
    try {
      response = await append('1', 'Atomic rollback target');
    } finally {
      await database.query(
        'DROP TRIGGER IF EXISTS test_block_target_update ON transactions; DROP FUNCTION IF EXISTS test_block_target_update();',
      );
    }

    expect(response?.status).toBe(500);

    const storedCategory = (await categories()).find((category) => category.id === '1');
    expect(storedCategory?.patterns).toEqual(['rewe', 'market']);

    const transactions = await request('/api/transactions').then((result) => result.json()) as Array<{
      purpose: string;
      category: unknown;
    }>;
    expect(transactions.find((transaction) => transaction.purpose === 'Atomic rollback target')?.category)
      .toBeNull();
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
        expenseType: null,
      },
      added: true,
    });
  });

  it('reports an already-stored pattern without changing anything', async () => {
    const before = await storedRows();
    const response = await append('1', 'market');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      category: { id: '1', name: 'Groceries', patterns: ['rewe', 'market'], hidden: false, windows: [], expenseType: null },
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

  it('stores and returns the expense type on create', async () => {
    const created = await post('/api/categories', {
      name: 'New car',
      patterns: ['dealer'],
      expenseType: 'one-time',
    });

    expect(created.status).toBe(201);
    expect((await created.json()).expenseType).toBe('one-time');

    const listed = (await categories()).find((category) => category.name === 'New car');
    expect(listed?.expenseType).toBe('one-time');
  });

  it('changes and clears the expense type on edit', async () => {
    const created = await post('/api/categories', { name: 'Food', patterns: ['food'], expenseType: 'recurring' });
    const id = (await created.json()).id as string;

    const changed = await request(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Food', patterns: ['food'], expenseType: 'one-time' }),
    });
    expect(changed.status).toBe(200);
    expect((await changed.json()).expenseType).toBe('one-time');

    const cleared = await request(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Food', patterns: ['food'] }),
    });
    expect(cleared.status).toBe(200);
    expect((await cleared.json()).expenseType).toBeNull();
  });

  it('refuses an unknown expense type without changing stored data', async () => {
    const before = await storedRows();

    const unknownLabel = await post('/api/categories', { name: 'Unknown type', patterns: ['x'], expenseType: 'monthly' });
    expect(unknownLabel.status).toBe(400);

    const notAString = await post('/api/categories', { name: 'Unknown type', patterns: ['x'], expenseType: true });
    expect(notAString.status).toBe(400);

    assert.deepEqual(await storedRows(), before);
  });

  it('leaves the expense type unchanged on an append', async () => {
    const created = await post('/api/categories', { name: 'Utilities', patterns: ['power'], expenseType: 'recurring' });
    const id = (await created.json()).id as string;

    const response = await append(id, 'water');

    expect(response.status).toBe(200);
    expect((await response.json()).category.expenseType).toBe('recurring');
  });

  it('changes no transaction when a category is classified', async () => {
    await insertTransaction('Dealer purchase', 'Car dealer');
    const created = await post('/api/categories', { name: 'New car', patterns: ['dealer'] });
    const id = (await created.json()).id as string;

    const before = await storedRows();

    const classified = await request(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New car', patterns: ['dealer'], expenseType: 'one-time' }),
    });
    expect(classified.status).toBe(200);

    const after = await storedRows();
    expect(after.transactions).toEqual(before.transactions);
  });

  it('reads every category that predates the expense type column as unset', async () => {
    if (database === undefined) {
      throw new Error('test database is not initialized');
    }

    const result = await database.query('SELECT name, expense_type FROM categories ORDER BY id');

    expect(result.rows).toEqual([
      { name: 'Groceries', expense_type: null },
      { name: 'Transport', expense_type: null },
      { name: 'Internal', expense_type: null },
    ]);
  });

  it('rejects an unknown expense type at the database', async () => {
    if (database === undefined) {
      throw new Error('test database is not initialized');
    }

    await expect(
      database.query(
        `INSERT INTO categories (name, patterns, expense_type) VALUES ('Unknown type', ARRAY['unknown'], 'monthly')`,
      ),
    ).rejects.toThrow('categories_expense_type_check');
  });
});
