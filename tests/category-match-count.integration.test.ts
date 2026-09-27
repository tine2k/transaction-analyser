import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';
import pg from 'pg';
import {
  CategoryError,
  countCategoryMatches,
} from '../server/utils/categories.ts';
import { endDatabasePool } from '../server/utils/db.ts';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];

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

async function waitForServer(baseUrl: string, child: ReturnType<typeof spawn>): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`test server exited with code ${child.exitCode}`);
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
  throw new Error('test server did not become ready');
}

if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
  test('category match-count preview (PostgreSQL integration)', {
    skip: 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.',
  }, () => {});
} else {
  test('counts unique direct matches without changing stored data', async () => {
    const admin = new pg.Pool({ connectionString: testDatabaseUrl });
    const schema = `category_match_count_test_${process.pid}_${Date.now()}`;
    const previousDatabaseUrl = process.env['DATABASE_URL'];
    const previewUrl = new URL(testDatabaseUrl);
    previewUrl.searchParams.set('options', `-csearch_path=${schema}`);
    let serverProcess: ReturnType<typeof spawn> | undefined;

    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await admin.query(`
        CREATE TABLE "${schema}".transactions (
          id bigint PRIMARY KEY,
          purpose text NOT NULL,
          category_id bigint
        )
      `);
      await admin.query(`
        CREATE TABLE "${schema}".categories (
          id bigint PRIMARY KEY,
          name text NOT NULL,
          patterns text[] NOT NULL
        )
      `);
      await admin.query(`
        INSERT INTO "${schema}".categories (id, name, patterns)
        VALUES (1, 'Earlier category', ARRAY['.*'])
      `);
      await admin.query(`
        INSERT INTO "${schema}".transactions (id, purpose, category_id)
        VALUES
          (10, 'REWE Markt', 1),
          (11, 'Card payment rewe at market', 1),
          (12, 'Bookshop', NULL)
      `);

      process.env['DATABASE_URL'] = previewUrl.toString();
      const before = await admin.query(`
        SELECT id, purpose, category_id FROM "${schema}".transactions ORDER BY id
      `);
      const categoriesBefore = await admin.query(`
        SELECT id, name, patterns FROM "${schema}".categories ORDER BY id
      `);

      assert.equal(await countCategoryMatches({ patterns: ['rewe', 'market'] }), 2);
      await assert.rejects(
        countCategoryMatches({ patterns: [] }),
        CategoryError,
      );
      await assert.rejects(
        countCategoryMatches({ patterns: ['rewe', 4] }),
        CategoryError,
      );
      await assert.rejects(
        countCategoryMatches({ patterns: ['['] }),
        CategoryError,
      );

      const after = await admin.query(`
        SELECT id, purpose, category_id FROM "${schema}".transactions ORDER BY id
      `);
      const categoriesAfter = await admin.query(`
        SELECT id, name, patterns FROM "${schema}".categories ORDER BY id
      `);
      assert.deepEqual(after.rows, before.rows);
      assert.deepEqual(categoriesAfter.rows, categoriesBefore.rows);

      const port = await availablePort();
      const baseUrl = `http://127.0.0.1:${port}`;
      serverProcess = spawn(process.execPath, ['.output/server/index.mjs'], {
        env: {
          ...process.env,
          DATABASE_URL: previewUrl.toString(),
          HOST: '127.0.0.1',
          PORT: String(port),
        },
        stdio: 'ignore',
      });
      await waitForServer(baseUrl, serverProcess);

      const successfulPreview = await fetch(`${baseUrl}/api/categories/match-count`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ patterns: ['rewe', 'market'] }),
      });
      assert.equal(successfulPreview.status, 200);
      assert.deepEqual(await successfulPreview.json(), { count: 2 });

      for (const patterns of [[], ['rewe', 4], ['[']]) {
        const refusedPreview = await fetch(`${baseUrl}/api/categories/match-count`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ patterns }),
        });
        assert.equal(refusedPreview.status, 400);
      }

      await admin.query(`ALTER TABLE "${schema}".transactions RENAME TO unavailable_transactions`);
      try {
        const failedPreview = await fetch(`${baseUrl}/api/categories/match-count`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ patterns: ['rewe'] }),
        });
        assert.equal(failedPreview.status, 500);
      } finally {
        await admin.query(`ALTER TABLE "${schema}".unavailable_transactions RENAME TO transactions`);
      }
    } finally {
      if (serverProcess !== undefined && serverProcess.exitCode === null) {
        const exited = once(serverProcess, 'exit');
        serverProcess.kill('SIGTERM');
        await exited;
      }
      await endDatabasePool();
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL'];
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl;
      }
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
      await admin.end();
    }
  });
}
