// @vitest-environment node
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { syncEasybank } from '../../shared/easybank-sync';
import { listPage, listRow, startFakeBank, type FakeBank } from '../helpers/fake-bank';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];

let database: pg.Client | undefined;
let bank: FakeBank;

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
    dryRun: true,
    source: 'scheduled' as const,
    baseUrl: bank.baseUrl,
    ...overrides,
  };
}

async function transactionCount(): Promise<number> {
  const result = await connection().query('SELECT count(*)::int AS count FROM transactions');
  return (result.rows[0] as { count: number }).count;
}

describe('easybank sync against PostgreSQL and a fake bank', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }
    database = new pg.Client({ connectionString: testDatabaseUrl });
    await database.connect();
    bank = await startFakeBank();
  });

  beforeEach(async () => {
    bank.mode = 'ok';
    await connection().query('TRUNCATE transactions, categories, import_runs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await database?.end();
    await bank.close();
  });

  it('records a non-writing run and writes nothing', async () => {
    const result = await syncEasybank(connection(), options());

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      return;
    }
    expect(result.plan).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 0, rowsWritten: 0 });
    expect(await transactionCount()).toBe(0);
    const runs = await connection().query(
      'SELECT source, non_writing, outcome, rows_read, rows_already_stored, rows_written, error FROM import_runs',
    );
    expect(runs.rows).toEqual([
      {
        source: 'scheduled',
        non_writing: true,
        outcome: 'success',
        rows_read: 2,
        rows_already_stored: 0,
        rows_written: 0,
        error: null,
      },
    ]);
  });

  it('writes the new rows and skips them on a second run', async () => {
    const first = await syncEasybank(connection(), options({ dryRun: false }));

    expect(first.status).toBe('success');
    if (first.status !== 'success') {
      return;
    }
    expect(first.plan).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 0, rowsWritten: 2 });
    expect(await transactionCount()).toBe(2);

    const second = await syncEasybank(connection(), options({ dryRun: false }));
    expect(second.status).toBe('success');
    if (second.status !== 'success') {
      return;
    }
    expect(second.plan).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 2, rowsWritten: 0 });
    expect(await transactionCount()).toBe(2);

    const stored = await connection().query(
      'SELECT booking_date, counterparty_name, counterparty_account, purpose FROM transactions ORDER BY id',
    );
    expect(stored.rows[0]).toMatchObject({
      counterparty_name: 'Bezahlung Karte MC/0001',
      counterparty_account: null,
    });
    expect(stored.rows[1]).toMatchObject({
      counterparty_name: 'Mag. Hanna Maier',
      counterparty_account: 'AT611904300234573201',
    });
  });

  it('categorises a synced row that matches a stored category and records the count', async () => {
    await connection().query("INSERT INTO categories (name, patterns) VALUES ('Streaming', ARRAY['netflix'])");

    const result = await syncEasybank(connection(), options({ dryRun: false }));

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      return;
    }
    expect(result.plan).toMatchObject({
      rowsRead: 2,
      rowsAlreadyStored: 0,
      rowsWritten: 2,
      rowsCategorised: 1,
    });
    const stored = await connection().query(
      `SELECT t.counterparty_name, c.name AS category
       FROM transactions AS t
       LEFT JOIN categories AS c ON c.id = t.category_id
       ORDER BY t.id`,
    );
    expect(stored.rows).toEqual([
      { counterparty_name: 'Bezahlung Karte MC/0001', category: null },
      { counterparty_name: 'Mag. Hanna Maier', category: 'Streaming' },
    ]);
    const runs = await connection().query('SELECT rows_written, rows_categorised FROM import_runs');
    expect(runs.rows).toEqual([{ rows_written: 2, rows_categorised: 1 }]);
  });

  it('records a failed run when the bank refuses the login', async () => {
    bank.mode = 'rejected';

    const result = await syncEasybank(connection(), options({ dryRun: false }));

    expect(result.status).toBe('failed');
    expect(await transactionCount()).toBe(0);
    const runs = await connection().query(
      'SELECT outcome, rows_written, error FROM import_runs',
    );
    expect(runs.rows[0]).toMatchObject({ outcome: 'failed', rows_written: 0 });
    expect((runs.rows[0] as { error: string | null }).error).toMatch(/refused the login/);
  });

  it('records no run when the credentials are absent', async () => {
    const result = await syncEasybank(connection(), options({ user: null, pin: null }));

    expect(result).toEqual({ status: 'unconfigured' });
    const runs = await connection().query('SELECT count(*)::int AS count FROM import_runs');
    expect((runs.rows[0] as { count: number }).count).toBe(0);
  });

  it('excludes rows at or below the value-date floor before the shared import path', async () => {
    const floorBank = await startFakeBank([
      listPage(
        [
          listRow('21.09.2026', '20.09.2026', 'Alte Buchung<br>AT611904300234573201 Alt GmbH', '-1,00'),
          listRow('21.09.2026', '21.09.2026', 'Neue Buchung<br>AT611904300234573201 Neu GmbH', '-2,00'),
        ],
        false,
        1,
      ),
    ]);

    try {
      const result = await syncEasybank(connection(), options({ baseUrl: floorBank.baseUrl, dryRun: false }));

      expect(result.status).toBe('success');
      if (result.status !== 'success') {
        return;
      }
      expect(result.plan).toMatchObject({ rowsRead: 1, rowsAlreadyStored: 0, rowsWritten: 1 });
      const stored = await connection().query('SELECT value_date::text AS value_date, counterparty_name FROM transactions ORDER BY id');
      expect(stored.rows).toEqual([{ value_date: '2026-09-21', counterparty_name: 'Neu GmbH' }]);
      const runs = await connection().query('SELECT rows_read, rows_written FROM import_runs');
      expect(runs.rows).toEqual([{ rows_read: 1, rows_written: 1 }]);
    } finally {
      await floorBank.close();
    }
  });
});
