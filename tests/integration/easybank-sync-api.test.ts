// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startFakeBank, type FakeBank } from '../helpers/fake-bank';
import { startFakePushover, type FakePushover } from '../helpers/fake-pushover';

// The sync-start endpoint, exercised through the built server: a spawned Nitro
// process reaches the fake bank over HTTP and the disposable database over
// PostgreSQL. The task records the run under the 'ui' source, and the tests read
// the run table directly to check it. A writing server also reaches the fake
// Pushover, so a screen-started sync's notification is observed without the
// network.
//
// See openspec/changes/add-easybank-sync-button/specs/easybank-sync/spec.md
// and openspec/changes/add-easybank-sync-button/specs/import-log/spec.md
// and openspec/changes/add-import-notification/specs/import-notification/spec.md

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const startupTimeoutMs = 15_000;

let database: pg.Pool | undefined;
let bank: FakeBank;
let pushover: FakePushover;

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

type SpawnedServer = {
  process: ChildProcess;
  baseUrl: string;
  output: () => string;
};

type TestServer = SpawnedServer;

// Starts the built server without waiting for it. An environment entry whose value
// is undefined is removed from the child's environment, which is how a test asks
// for an absent variable rather than one it has set to a value.
async function spawnServer(environment: Record<string, string | undefined>): Promise<SpawnedServer> {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = '';
  const childEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: testDatabaseUrl ?? '',
    HOST: '127.0.0.1',
    PORT: String(port),
    EASYBANK_USER: '',
    EASYBANK_PIN: '',
    EASYBANK_SYNC_WRITE: '',
    EASYBANK_BASE_URL: bank.baseUrl,
    EASYBANK_PERSON: 'Default',
  };
  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) {
      delete childEnvironment[name];
    } else {
      childEnvironment[name] = value;
    }
  }

  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });

  return { process: child, baseUrl, output: () => output };
}

async function startServer(environment: Record<string, string> = {}): Promise<TestServer> {
  const server = await spawnServer(environment);
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (server.process.exitCode !== null || server.process.signalCode !== null) {
      throw new Error(`test server exited before becoming ready:\n${server.output()}`);
    }
    try {
      const response = await fetch(`${server.baseUrl}/api/health`);
      if (response.ok) {
        return server;
      }
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`test server did not become ready within ${startupTimeoutMs}ms:\n${server.output()}`);
}

async function waitForExit(server: SpawnedServer, timeoutMs: number): Promise<number | null> {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.process.kill('SIGKILL');
      reject(new Error(`test server did not exit within ${timeoutMs}ms:\n${server.output()}`));
    }, timeoutMs);
    server.process.once('close', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

async function startRefusedServer(
  environment: Record<string, string | undefined>,
): Promise<{ exitCode: number | null; output: string; baseUrl: string }> {
  const server = await spawnServer(environment);
  const exitCode = await waitForExit(server, startupTimeoutMs);
  return { exitCode, output: server.output(), baseUrl: server.baseUrl };
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
    pushover = await startFakePushover();
  });

  beforeEach(async () => {
    bank.mode = 'ok';
    bank.delayMs = 0;
    await connection().query('TRUNCATE transactions, import_runs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await database?.end();
    await bank.close();
    await pushover.close();
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
      server = await startServer({
        EASYBANK_USER: 'user',
        EASYBANK_PIN: 'pin',
        EASYBANK_SYNC_WRITE: 'true',
        PUSHOVER_TOKEN: 'app-token',
        PUSHOVER_USER: 'user-key',
        PUSHOVER_BASE_URL: pushover.baseUrl,
      });
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('notifies the fake Pushover once when it writes uncategorised rows', async () => {
      pushover.requests.length = 0;

      const response = await startSync(server);

      expect(await response.json()).toEqual({ status: 'success' });
      expect(pushover.requests).toHaveLength(1);
      expect(pushover.requests[0]?.method).toBe('POST');
      expect(pushover.requests[0]?.path).toBe('/1/messages.json');
      const body = new URLSearchParams(pushover.requests[0]!.body);
      expect(body.get('token')).toBe('app-token');
      expect(body.get('user')).toBe('user-key');
      expect(body.get('title')).toBe('2 new transactions need a category');
      expect(body.get('message')).toBe('2 new: 0 categorised, 2 without a category.');
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

  describe('with a configured person and writing enabled', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startServer({
        EASYBANK_USER: 'user',
        EASYBANK_PIN: 'pin',
        EASYBANK_SYNC_WRITE: 'true',
        EASYBANK_PERSON: '  anna  ',
      });
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('imports into the configured person and records it on the run', async () => {
      const response = await startSync(server);

      expect(await response.json()).toEqual({ status: 'success' });
      const stored = await connection().query(`
        SELECT DISTINCT p.name AS person
        FROM transactions AS t
        JOIN people AS p ON p.id = t.person_id
      `);
      expect(stored.rows).toEqual([{ person: 'Anna' }]);
      const runs = await connection().query(`
        SELECT r.source, p.name AS person
        FROM import_runs AS r
        LEFT JOIN people AS p ON p.id = r.person_id
      `);
      expect(runs.rows).toEqual([{ source: 'ui', person: 'Anna' }]);
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

  describe('startup requires the sync person', () => {
    it('exits non-zero without serving when the variable is absent', async () => {
      const refused = await startRefusedServer({ EASYBANK_PERSON: undefined });

      expect(refused.exitCode).toBe(1);
      expect(refused.output).toContain('EASYBANK_PERSON');
      await expect(fetch(`${refused.baseUrl}/api/health`)).rejects.toThrow();
    });

    it('exits non-zero without serving when the variable is blank', async () => {
      const refused = await startRefusedServer({ EASYBANK_PERSON: '   ' });

      expect(refused.exitCode).toBe(1);
      expect(refused.output).toContain('EASYBANK_PERSON');
      await expect(fetch(`${refused.baseUrl}/api/health`)).rejects.toThrow();
    });

    it('serves when the variable names a person', async () => {
      const server = await startServer({ EASYBANK_PERSON: 'Default' });

      try {
        const response = await fetch(`${server.baseUrl}/api/health`);
        expect(response.ok).toBe(true);
      } finally {
        await stopServer(server);
      }
    });
  });
});
