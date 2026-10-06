// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startFakeBank, type FakeBank } from '../helpers/fake-bank';

// The sync-start endpoint, exercised through the built server: a spawned Nitro
// process reaches the fake bank over HTTP and the disposable database over
// PostgreSQL. The task records the run under the 'ui' source, and the tests read
// the run table directly to check it.
//
// See openspec/changes/add-easybank-sync-button/specs/easybank-sync/spec.md
// and openspec/changes/add-easybank-sync-button/specs/import-log/spec.md

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const startupTimeoutMs = 15_000;

let database: pg.Pool | undefined;
let bank: FakeBank;

function connection(): pg.Pool {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  return database;
}

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

type TestServer = {
  process: ChildProcess;
  baseUrl: string;
  output: () => string;
};

async function startServer(environment: Record<string, string>): Promise<TestServer> {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = '';
  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl ?? '',
      HOST: '127.0.0.1',
      PORT: String(port),
      EASYBANK_USER: '',
      EASYBANK_PIN: '',
      EASYBANK_SYNC_WRITE: '',
      EASYBANK_BASE_URL: bank.baseUrl,
      ...environment,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });

  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`test server exited before becoming ready:\n${output}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return { process: child, baseUrl, output: () => output };
      }
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`test server did not become ready within ${startupTimeoutMs}ms:\n${output}`);
}

async function stopServer(server: TestServer): Promise<void> {
  if (server.process.exitCode === null && server.process.signalCode === null) {
    const exited = once(server.process, 'exit');
    server.process.kill('SIGTERM');
    await exited;
  }
}

async function startSync(server: TestServer): Promise<Response> {
  return fetch(`${server.baseUrl}/api/easybank/sync`, { method: 'POST' });
}

async function recordedRuns(): Promise<Array<Record<string, unknown>>> {
  const result = await connection().query(
    'SELECT source, non_writing, outcome, rows_read, rows_already_stored, rows_written, error FROM import_runs ORDER BY id',
  );
  return result.rows as Array<Record<string, unknown>>;
}

async function transactionCount(): Promise<number> {
  const result = await connection().query('SELECT count(*)::int AS count FROM transactions');
  return (result.rows[0] as { count: number }).count;
}

describe('sync-start endpoint against a spawned server', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }
    database = new pg.Pool({ connectionString: testDatabaseUrl });
    bank = await startFakeBank();
  });

  beforeEach(async () => {
    bank.mode = 'ok';
    bank.delayMs = 0;
    await connection().query('TRUNCATE transactions, import_runs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await database?.end();
    await bank.close();
  });

  describe('with credentials and writing disabled', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startServer({ EASYBANK_USER: 'user', EASYBANK_PIN: 'pin' });
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('starts the sync, records one ui run, and writes nothing', async () => {
      const response = await startSync(server);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'success' });
      expect(await transactionCount()).toBe(0);
      expect(await recordedRuns()).toEqual([
        {
          source: 'ui',
          non_writing: true,
          outcome: 'success',
          rows_read: 2,
          rows_already_stored: 0,
          rows_written: 0,
          error: null,
        },
      ]);
    });

    it('records a fresh non-writing run on a repeated start', async () => {
      await startSync(server);
      await startSync(server);

      const runs = await recordedRuns();
      expect(runs).toHaveLength(2);
      expect(runs.map((run) => run['source'])).toEqual(['ui', 'ui']);
      expect(runs.map((run) => run['non_writing'])).toEqual([true, true]);
      expect(runs.map((run) => run['rows_written'])).toEqual([0, 0]);
      expect(await transactionCount()).toBe(0);
    });

    it('records a failed run when the bank refuses the login', async () => {
      bank.mode = 'rejected';

      const response = await startSync(server);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'failed' });
      const runs = await recordedRuns();
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({ source: 'ui', outcome: 'failed', rows_written: 0 });
      expect(String(runs[0]?.['error'])).toMatch(/refused the login/);
      expect(await transactionCount()).toBe(0);
    });

    it('starts no run when the path is requested without a POST', async () => {
      const response = await fetch(`${server.baseUrl}/api/easybank/sync`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(await recordedRuns()).toHaveLength(0);
    });

    it('joins the run in progress instead of starting a second one', async () => {
      bank.delayMs = 300;

      const first = startSync(server);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const second = startSync(server);
      const [firstResponse, secondResponse] = await Promise.all([first, second]);

      expect(await firstResponse.json()).toEqual({ status: 'success' });
      expect(await secondResponse.json()).toEqual({ status: 'success' });
      expect(await recordedRuns()).toHaveLength(1);
    });
  });

  describe('with credentials and writing enabled', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startServer({ EASYBANK_USER: 'user', EASYBANK_PIN: 'pin', EASYBANK_SYNC_WRITE: 'true' });
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('writes the new rows and skips them on a repeated start', async () => {
      const first = await startSync(server);

      expect(await first.json()).toEqual({ status: 'success' });
      expect(await transactionCount()).toBe(2);
      expect((await recordedRuns())[0]).toMatchObject({
        source: 'ui',
        non_writing: false,
        rows_read: 2,
        rows_already_stored: 0,
        rows_written: 2,
      });

      const second = await startSync(server);

      expect(await second.json()).toEqual({ status: 'success' });
      expect(await transactionCount()).toBe(2);
      expect((await recordedRuns())[1]).toMatchObject({
        source: 'ui',
        non_writing: false,
        rows_read: 2,
        rows_already_stored: 2,
        rows_written: 0,
      });
    });
  });

  describe('without credentials', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startServer({});
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('answers unconfigured and records no run', async () => {
      const response = await startSync(server);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'unconfigured' });
      expect(await recordedRuns()).toHaveLength(0);
    });
  });
});
