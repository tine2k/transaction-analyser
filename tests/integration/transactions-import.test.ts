// @vitest-environment node
import assert from 'node:assert/strict';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ImportFailure,
  InvalidRowsFailure,
  finishImportRun,
  importCsv,
  startImportRun,
} from '../../shared/transactions-import';
import type { ImportPlan } from '../../shared/transactions-import';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const HEADER = 'Date;Value date;Category;Name;Purpose;Account;Bank;Amount;Currency';

function csv(...lines: string[]): string {
  return [HEADER, ...lines].join('\n') + '\n';
}

type RowOptions = {
  date?: string;
  valueDate?: string;
  name?: string;
  purpose?: string;
  account?: string;
  amount?: string;
  currency?: string;
};

function row(options: RowOptions = {}): string {
  return [
    options.date ?? '25.09.2026',
    options.valueDate ?? options.date ?? '25.09.2026',
    '',
    options.name ?? 'Shop',
    options.purpose ?? 'Purchase',
    options.account ?? '',
    '',
    options.amount ?? '-9,99',
    options.currency ?? 'EUR',
  ].join(';');
}

let database: pg.Client | undefined;

function connection(): pg.Client {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  return database;
}

// The same start-import-finish wrapper the command-line importer uses, so the run
// records the tests assert on are produced by the real path.
async function runImport(text: string, dryRun = false): Promise<ImportPlan> {
  const client = connection();
  const runId = await startImportRun(client, { source: 'manual', nonWriting: dryRun });
  try {
    const plan = await importCsv(client, { kind: 'text', text, label: 'test.csv' }, { dryRun });
    await finishImportRun(client, runId, {
      outcome: 'success',
      rowsRead: plan.rowsRead,
      rowsAlreadyStored: plan.rowsAlreadyStored,
      rowsWritten: plan.rowsWritten,
      error: null,
    });
    return plan;
  } catch (error) {
    const rowsRead = error instanceof ImportFailure ? error.rowsRead : 0;
    await finishImportRun(client, runId, {
      outcome: 'failed',
      rowsRead,
      rowsAlreadyStored: 0,
      rowsWritten: 0,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function transactionCount(): Promise<number> {
  const result = await connection().query('SELECT count(*)::int AS count FROM transactions');
  return (result.rows[0] as { count: number }).count;
}

async function runs(): Promise<Array<Record<string, unknown>>> {
  const result = await connection().query(
    'SELECT source, non_writing, outcome, rows_read, rows_already_stored, rows_written, error FROM import_runs ORDER BY id',
  );
  return result.rows as Array<Record<string, unknown>>;
}

describe('transaction import against PostgreSQL', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }
    database = new pg.Client({ connectionString: testDatabaseUrl });
    await database.connect();
  });

  beforeEach(async () => {
    await connection().query('TRUNCATE transactions, categories, import_runs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await database?.end();
  });

  it('writes every row of a first import and records a successful manual run', async () => {
    const plan = await runImport(csv(row(), row({ name: 'Employer', purpose: 'Salary', amount: '2500,00' })));

    expect(plan).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 0, rowsWritten: 2 });
    expect(await transactionCount()).toBe(2);
    expect(await runs()).toEqual([
      {
        source: 'manual',
        non_writing: false,
        outcome: 'success',
        rows_read: 2,
        rows_already_stored: 0,
        rows_written: 2,
        error: null,
      },
    ]);
  });

  it('writes nothing on a second run of the same rows', async () => {
    await runImport(csv(row(), row({ name: 'Employer', purpose: 'Salary', amount: '2500,00' })));
    const second = await runImport(csv(row(), row({ name: 'Employer', purpose: 'Salary', amount: '2500,00' })));

    expect(second).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 2, rowsWritten: 0 });
    expect(await transactionCount()).toBe(2);
  });

  it('preserves a genuine duplicate and writes only the surplus over what is stored', async () => {
    const twice = await runImport(csv(row(), row()));
    expect(twice).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 0, rowsWritten: 2 });

    const surplus = await runImport(csv(row(), row(), row()));
    expect(surplus).toMatchObject({ rowsRead: 3, rowsAlreadyStored: 2, rowsWritten: 1 });
    expect(await transactionCount()).toBe(3);
  });

  it('matches an amount numerically, not as text', async () => {
    await runImport(csv(row({ amount: '-33,61' })));
    const again = await runImport(csv(row({ amount: '-33,610' })));

    expect(again).toMatchObject({ rowsRead: 1, rowsAlreadyStored: 1, rowsWritten: 0 });
    expect(await transactionCount()).toBe(1);
  });

  it('leaves a stored transaction, including its category, exactly as it was', async () => {
    await connection().query("INSERT INTO categories (name, patterns) VALUES ('Groceries', ARRAY['shop'])");
    await connection().query(
      `INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id)
       VALUES ('2026-09-25', '2026-09-25', -9.99, 'Purchase', 'Shop', NULL, (SELECT id FROM categories WHERE name = 'Groceries'))`,
    );
    const before = await connection().query(
      'SELECT id, booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id FROM transactions ORDER BY id',
    );

    const plan = await runImport(csv(row(), row({ name: 'Employer', purpose: 'Salary', amount: '2500,00' })));

    expect(plan).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 1, rowsWritten: 1 });
    const after = await connection().query(
      'SELECT id, booking_date, value_date, amount, purpose, counterparty_name, counterparty_account, category_id FROM transactions ORDER BY id',
    );
    expect(after.rows.slice(0, 1)).toEqual(before.rows);
    expect(after.rows).toHaveLength(2);
  });

  it('refuses the whole file when one row is invalid and records the failure', async () => {
    await expect(
      runImport(csv(row(), row({ date: '31.02.2026' }))),
    ).rejects.toBeInstanceOf(InvalidRowsFailure);

    expect(await transactionCount()).toBe(0);
    expect(await runs()).toEqual([
      {
        source: 'manual',
        non_writing: false,
        outcome: 'failed',
        rows_read: 2,
        rows_already_stored: 0,
        rows_written: 0,
        error: '1 invalid row',
      },
    ]);
  });

  it('rolls every written row back when the write fails part-way', async () => {
    await connection().query(`
      CREATE OR REPLACE FUNCTION test_fail_on_marked_purpose() RETURNS trigger AS $$
      BEGIN
        IF NEW.purpose = 'MARKED' THEN
          RAISE EXCEPTION 'forced write failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await connection().query(
      'CREATE TRIGGER test_fail_on_marked_purpose BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION test_fail_on_marked_purpose()',
    );

    try {
      await expect(
        runImport(csv(row(), row({ name: 'Doomed', purpose: 'MARKED' }))),
      ).rejects.toThrow(/forced write failure/);
      expect(await transactionCount()).toBe(0);
      expect((await runs())[0]).toMatchObject({ outcome: 'failed', rows_written: 0 });
    } finally {
      await connection().query('DROP TRIGGER test_fail_on_marked_purpose ON transactions');
      await connection().query('DROP FUNCTION test_fail_on_marked_purpose()');
    }
  });

  it('classifies without writing in the non-writing mode and records a non-writing run', async () => {
    const plan = await runImport(csv(row(), row({ name: 'Employer', purpose: 'Salary', amount: '2500,00' })), true);

    expect(plan).toMatchObject({ rowsRead: 2, rowsAlreadyStored: 0, rowsWritten: 0 });
    expect(plan.newRows).toHaveLength(2);
    expect(await transactionCount()).toBe(0);
    expect(await runs()).toEqual([
      {
        source: 'manual',
        non_writing: true,
        outcome: 'success',
        rows_read: 2,
        rows_already_stored: 0,
        rows_written: 0,
        error: null,
      },
    ]);
  });

  it('leaves a run that has started reading as in progress', async () => {
    const runId = await startImportRun(connection(), { source: 'scheduled', nonWriting: true });
    const stored = await connection().query(
      'SELECT outcome, finished_at, source, non_writing FROM import_runs WHERE id = $1',
      [runId],
    );

    expect(stored.rows).toEqual([
      { outcome: 'in_progress', finished_at: null, source: 'scheduled', non_writing: true },
    ]);
  });

  it('reports a shape failure and records the run as failed', async () => {
    await expect(runImport('Date;Amount\n25.09.2026;-9,99\n')).rejects.toBeInstanceOf(ImportFailure);
    expect(await transactionCount()).toBe(0);
    expect((await runs())[0]).toMatchObject({ outcome: 'failed', rows_written: 0 });
    assert.ok((await runs())[0]?.error);
  });
});
