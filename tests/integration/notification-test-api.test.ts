// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startFakePushover, type FakePushover } from '../helpers/fake-pushover';

// The notification-test endpoint, exercised through the built server: a spawned
// Nitro process reads its credentials from the environment — exactly as the
// deployed container does — and reaches the fake Pushover over HTTP. The
// disposable database is used only to prove the endpoint writes no run.
//
// See openspec/changes/add-pushover-test-button/specs/import-notification/spec.md
// and openspec/changes/add-pushover-test-button/specs/backend-shell/spec.md

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const startupTimeoutMs = 15_000;

let database: pg.Pool | undefined;
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
      PUSHOVER_TOKEN: '',
      PUSHOVER_USER: '',
      PUSHOVER_BASE_URL: '',
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

async function sendTest(server: TestServer): Promise<Response> {
  return fetch(`${server.baseUrl}/api/imports/test-notification`, { method: 'POST' });
}

async function recordedRunCount(): Promise<number> {
  const result = await connection().query('SELECT count(*)::int AS count FROM import_runs');
  return (result.rows[0] as { count: number }).count;
}

describe('notification-test endpoint against a spawned server', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }
    database = new pg.Pool({ connectionString: testDatabaseUrl });
    pushover = await startFakePushover();
  });

  beforeEach(async () => {
    pushover.mode = 'ok';
    pushover.requests.length = 0;
    await connection().query('TRUNCATE transactions, import_runs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await database?.end();
    await pushover.close();
  });

  describe('with the credentials configured', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startServer({
        PUSHOVER_TOKEN: 'app-token',
        PUSHOVER_USER: 'user-key',
        PUSHOVER_BASE_URL: pushover.baseUrl,
      });
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('sends exactly one test message and records no run', async () => {
      const response = await sendTest(server);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'sent' });
      expect(pushover.requests).toHaveLength(1);
      expect(pushover.requests[0]?.method).toBe('POST');
      expect(pushover.requests[0]?.path).toBe('/1/messages.json');
      const body = new URLSearchParams(pushover.requests[0]!.body);
      expect(body.get('token')).toBe('app-token');
      expect(body.get('user')).toBe('user-key');
      expect(body.get('title')?.toLowerCase()).toContain('test');
      expect(body.get('message')?.toLowerCase()).toContain('test');
      expect(await recordedRunCount()).toBe(0);
    });

    it('answers failed with a credential-free reason when Pushover refuses', async () => {
      pushover.mode = 'error';

      const response = await sendTest(server);

      expect(response.status).toBe(200);
      const answer = (await response.json()) as { status: string; reason: string };
      expect(answer.status).toBe('failed');
      expect(answer.reason).toContain('rate limit exceeded');
      expect(answer.reason).not.toContain('app-token');
      expect(answer.reason).not.toContain('user-key');
      expect(pushover.requests).toHaveLength(1);
      expect(await recordedRunCount()).toBe(0);
    });

    it('answers the browser application for a request without a POST', async () => {
      const response = await fetch(`${server.baseUrl}/api/imports/test-notification`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(pushover.requests).toHaveLength(0);
      expect(await recordedRunCount()).toBe(0);
    });
  });

  describe('without the credentials', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startServer({});
    });

    afterAll(async () => {
      await stopServer(server);
    });

    it('answers unconfigured without attempting a message and records no run', async () => {
      const response = await sendTest(server);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'unconfigured' });
      expect(pushover.requests).toHaveLength(0);
      expect(await recordedRunCount()).toBe(0);
    });
  });
});
