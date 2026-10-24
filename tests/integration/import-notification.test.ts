// @vitest-environment node
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncEasybank } from '../../shared/easybank-sync';
import { finishImportRun, importCsv, resolvePerson, setImportRunPerson, startImportRun } from '../../shared/transactions-import';
import { startFakeBank, type FakeBank } from '../helpers/fake-bank';
import { startFakePushover, type FakePushover } from '../helpers/fake-pushover';

// The import notification, exercised through the real sync path against
// PostgreSQL, the fake bank, and the fake Pushover. The tests check the trigger,
// the message's counts, the silence of the paths that must not notify, and that
// a notification failure never touches the import.
//
// See openspec/changes/add-import-notification/specs/import-notification/spec.md

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const HEADER = 'Date;Value date;Category;Name;Purpose;Account;Bank;Amount;Currency';

let database: pg.Client | undefined;
let bank: FakeBank;
let pushover: FakePushover;

function connection(): pg.Client {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  return database;
}

function options(overrides: Record<string, unknown> = {}) {
  return {
    user: 'user',
    pin: 'pin',
    from: '2026-07-01',
    to: '2026-10-31',
    dryRun: false,
    source: 'scheduled' as const,
    baseUrl: bank.baseUrl,
    notification: { token: 'app-token', user: 'user-key', baseUrl: pushover.baseUrl },
    ...overrides,
  };
}

function messageBody(request: { body: string }): URLSearchParams {
  return new URLSearchParams(request.body);
}

async function transactionCount(): Promise<number> {
  const result = await connection().query('SELECT count(*)::int AS count FROM transactions');
  return (result.rows[0] as { count: number }).count;
}

async function recordedRuns(): Promise<Array<Record<string, unknown>>> {
  const result = await connection().query(
    'SELECT outcome, rows_written, rows_categorised FROM import_runs ORDER BY id',
  );
  return result.rows as Array<Record<string, unknown>>;
}

describe('import notification through the sync path', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }
    database = new pg.Client({ connectionString: testDatabaseUrl });
    await database.connect();
    bank = await startFakeBank();
    pushover = await startFakePushover();
  });

  beforeEach(async () => {
    bank.mode = 'ok';
    pushover.mode = 'ok';
    pushover.requests.length = 0;
    await connection().query('TRUNCATE transactions, categories, import_runs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await database?.end();
    await bank.close();
    await pushover.close();
  });

  it('sends one message with the run counts when a written row stays uncategorised', async () => {
    await connection().query("INSERT INTO categories (name, patterns) VALUES ('Streaming', ARRAY['netflix'])");

    const result = await syncEasybank(connection(), options());

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      return;
    }
    expect(result.plan).toMatchObject({ rowsWritten: 2, rowsCategorised: 1 });

    expect(pushover.requests).toHaveLength(1);
    const request = pushover.requests[0]!;
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/1/messages.json');
    const body = messageBody(request);
    expect(body.get('token')).toBe('app-token');
    expect(body.get('user')).toBe('user-key');
    expect(body.get('title')).toBe('1 new transaction needs a category');
    expect(body.get('message')).toBe('2 new: 1 categorised, 1 without a category.');

    expect(await recordedRuns()).toEqual([
      { outcome: 'success', rows_written: 2, rows_categorised: 1 },
    ]);
  });

  it('sends nothing when every written row received a category', async () => {
    await connection().query(
      "INSERT INTO categories (name, patterns) VALUES ('Everything', ARRAY['netflix', 'Karte'])",
    );

    const result = await syncEasybank(connection(), options());

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      return;
    }
    expect(result.plan).toMatchObject({ rowsWritten: 2, rowsCategorised: 2 });
    expect(pushover.requests).toHaveLength(0);
  });

  it('sends nothing when the run wrote no new transaction', async () => {
    await syncEasybank(connection(), options());
    pushover.requests.length = 0;

    const second = await syncEasybank(connection(), options());

    expect(second.status).toBe('success');
    if (second.status !== 'success') {
      return;
    }
    expect(second.plan).toMatchObject({ rowsAlreadyStored: 2, rowsWritten: 0 });
    expect(pushover.requests).toHaveLength(0);
  });

  it('sends nothing for a non-writing run', async () => {
    const result = await syncEasybank(connection(), options({ dryRun: true }));

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      return;
    }
    expect(result.plan).toMatchObject({ rowsWritten: 0 });
    expect(pushover.requests).toHaveLength(0);
  });

  it('sends nothing when the run failed', async () => {
    bank.mode = 'rejected';

    const result = await syncEasybank(connection(), options());

    expect(result.status).toBe('failed');
    expect(pushover.requests).toHaveLength(0);
  });

  it('sends nothing for the manual CSV import', async () => {
    const text =
      [HEADER, '25.09.2026;25.09.2026;;Shop;Purchase;;;-9,99;EUR'].join('\n') + '\n';
    const runId = await startImportRun(connection(), { source: 'manual', nonWriting: false });
    const person = await resolvePerson(connection(), 'Default');
    await setImportRunPerson(connection(), runId, person.id);
    const plan = await importCsv(connection(), { kind: 'text', text, label: 'test.csv' }, { dryRun: false, person });
    await finishImportRun(connection(), runId, {
      outcome: 'success',
      rowsRead: plan.rowsRead,
      rowsAlreadyStored: plan.rowsAlreadyStored,
      rowsWritten: plan.rowsWritten,
      rowsCategorised: plan.rowsCategorised,
      error: null,
    });

    expect(plan.rowsWritten).toBe(1);
    expect(pushover.requests).toHaveLength(0);
  });

  it('leaves the run a success with its rows stored when Pushover refuses', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pushover.mode = 'error';

    const result = await syncEasybank(connection(), options());

    expect(result.status).toBe('success');
    expect(pushover.requests).toHaveLength(1);
    expect(await transactionCount()).toBe(2);
    expect(await recordedRuns()).toEqual([
      { outcome: 'success', rows_written: 2, rows_categorised: 0 },
    ]);
    const logText = logged.mock.calls.flat().join(' ');
    expect(logText).toContain('import notification failed');
    expect(logText).toContain('rate limit exceeded');
    expect(logText).not.toContain('app-token');
    expect(logText).not.toContain('user-key');
  });

  it('leaves the run a success with its rows stored when Pushover cannot be reached', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const unreachable = await startFakePushover();
    const unreachableUrl = unreachable.baseUrl;
    await unreachable.close();

    const result = await syncEasybank(
      connection(),
      options({ notification: { token: 'app-token', user: 'user-key', baseUrl: unreachableUrl } }),
    );

    expect(result.status).toBe('success');
    expect(await transactionCount()).toBe(2);
    expect(await recordedRuns()).toEqual([
      { outcome: 'success', rows_written: 2, rows_categorised: 0 },
    ]);
    expect(logged.mock.calls.flat().join(' ')).toContain('import notification failed');
  });

  it('finishes the run record before it attempts the notification', async () => {
    const observed: Array<Record<string, unknown>> = [];
    const fetchImpl: typeof fetch = async () => {
      const runs = await connection().query(
        'SELECT outcome, (finished_at IS NOT NULL) AS finished FROM import_runs ORDER BY id DESC LIMIT 1',
      );
      observed.push(runs.rows[0] as Record<string, unknown>);
      return new Response(JSON.stringify({ status: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await syncEasybank(
      connection(),
      options({ notification: { token: 'app-token', user: 'user-key', fetchImpl } }),
    );

    expect(result.status).toBe('success');
    expect(observed).toEqual([{ outcome: 'success', finished: true }]);
  });

  it('ends the attempt within its bound when Pushover never answers', async () => {
    pushover.mode = 'hang';

    const startedAt = Date.now();
    const result = await syncEasybank(
      connection(),
      options({
        notification: { token: 'app-token', user: 'user-key', baseUrl: pushover.baseUrl, timeoutMs: 200 },
      }),
    );
    const elapsedMs = Date.now() - startedAt;

    expect(result.status).toBe('success');
    expect(elapsedMs).toBeLessThan(5_000);
    expect(pushover.requests).toHaveLength(1);
    expect(await transactionCount()).toBe(2);
    expect(await recordedRuns()).toEqual([
      { outcome: 'success', rows_written: 2, rows_categorised: 0 },
    ]);
  });
});
