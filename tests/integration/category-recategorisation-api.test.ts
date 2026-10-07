// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// The on-demand re-categorisation, exercised through the built server against the
// disposable database. It re-evaluates every stored transaction, answers with the
// number whose category changed, stores nothing, and serializes with a concurrent
// category change.
//
// See openspec/changes/match-counterparty-and-recategorise/specs/category-recategorisation/spec.md

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

function recategorise(): Promise<Response> {
  return request('/api/categories/recategorise', { method: 'POST' });
}

async function changedCount(response: Response): Promise<number> {
  expect(response.status).toBe(200);
  return ((await response.json()) as { changed: number }).changed;
}

async function insertCategory(name: string, patterns: string[]): Promise<void> {
  await connection().query('INSERT INTO categories (name, patterns) VALUES ($1, $2)', [name, patterns]);
}

async function insertTransaction(
  purpose: string,
  counterpartyName: string,
  categoryName: string | null = null,
): Promise<void> {
  await connection().query(
    `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id)
     VALUES ('2026-03-01', '2026-03-01', -1.00, $1, $2, NULL, (SELECT id FROM categories WHERE name = $3))`,
    [purpose, counterpartyName, categoryName],
  );
}

async function categoryName(purpose: string): Promise<string | null> {
  const result = await connection().query(
    `SELECT c.name AS category
     FROM transactions AS t
     LEFT JOIN categories AS c ON c.id = t.category_id
     WHERE t.purpose = $1`,
    [purpose],
  );
  return (result.rows[0] as { category: string | null } | undefined)?.category ?? null;
}

async function transactionValues(): Promise<unknown[]> {
  const result = await connection().query(
    'SELECT id, booking_date, value_date, amount, purpose, counterparty_name, counterparty_account FROM transactions ORDER BY id',
  );
  return result.rows;
}

describe('category re-categorisation API integration', () => {
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

  it('categorises an uncategorised transaction and reports it as changed', async () => {
    await insertCategory('Acme', ['acme']);
    await insertTransaction('Purchase', 'ACME Books');

    expect(await changedCount(await recategorise())).toBe(1);
    expect(await categoryName('Purchase')).toBe('Acme');
  });

  it('leaves a transaction uncategorised when its match has gone and reports it as changed', async () => {
    await insertTransaction('Purchase', 'ACME Books', 'Groceries');

    expect(await changedCount(await recategorise())).toBe(1);
    expect(await categoryName('Purchase')).toBeNull();
  });

  it('moves a transaction to the category the rule selects and reports it as changed', async () => {
    await insertCategory('Acme', ['acme']);
    await insertTransaction('Purchase', 'ACME Books', 'Groceries');

    expect(await changedCount(await recategorise())).toBe(1);
    expect(await categoryName('Purchase')).toBe('Acme');
  });

  it('does not count an already-correct assignment', async () => {
    expect(await changedCount(await recategorise())).toBe(0);
  });

  it('reports zero on a repeat after the first run changed a transaction', async () => {
    await insertCategory('Acme', ['acme']);
    await insertTransaction('Purchase', 'ACME Books');

    expect(await changedCount(await recategorise())).toBe(1);
    expect(await changedCount(await recategorise())).toBe(0);
  });

  it('records no import run', async () => {
    await insertCategory('Acme', ['acme']);
    await insertTransaction('Purchase', 'ACME Books');

    await recategorise();

    const runs = await connection().query('SELECT count(*)::int AS count FROM import_runs');
    expect((runs.rows[0] as { count: number }).count).toBe(0);
  });

  it('changes only the category reference', async () => {
    await insertCategory('Acme', ['acme']);
    await insertTransaction('Purchase', 'ACME Books');
    const before = await transactionValues();

    await recategorise();

    assert.deepEqual(await transactionValues(), before);
    expect(await categoryName('Purchase')).toBe('Acme');
  });

  it('answers a database failure as an error rather than a count', async () => {
    const broken = await startServer('postgres://test:secret@127.0.0.1:1/unreachable');

    try {
      const response = await fetch(`${broken.url}/api/categories/recategorise`, { method: 'POST' });
      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).not.toContain('secret');
      expect(body).not.toContain('127.0.0.1:1');
    } finally {
      const exited = once(broken.child, 'exit');
      broken.child.kill('SIGTERM');
      await exited;
    }
  });

  it('serializes with a concurrent category change and leaves a consistent assignment', async () => {
    await insertTransaction('Purchase', 'ACME Books');

    const [recategorised, created] = await Promise.all([
      recategorise(),
      post('/api/categories', { name: 'Acme', patterns: ['acme'] }),
    ]);

    expect(recategorised.status).toBe(200);
    expect(created.status).toBe(201);
    expect(await categoryName('Purchase')).toBe('Acme');
  });

  it('serializes two concurrent re-categorisations and counts the change once', async () => {
    await insertCategory('Acme', ['acme']);
    await insertTransaction('Purchase', 'ACME Books');

    const [first, second] = await Promise.all([recategorise(), recategorise()]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect([await changedCount(first), await changedCount(second)].sort()).toEqual([0, 1]);
    expect(await categoryName('Purchase')).toBe('Acme');
  });
});
