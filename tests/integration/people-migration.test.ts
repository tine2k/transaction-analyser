// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const migrationsDirectory = fileURLToPath(new URL('../../db/migrations', import.meta.url));

let database: pg.Client | undefined;

function connection(): pg.Client {
  if (database === undefined) {
    throw new Error('test database is not initialized');
  }
  return database;
}

// The migration files up to and including the given version, in the order the
// runner would apply them. The person migration is applied separately so the test
// can seed the pre-extension shape first.
function migrationFilesThrough(version: number): string[] {
  return readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .filter((fileName) => Number(/^(\d+)/.exec(fileName)?.[1] ?? Number.NaN) <= version)
    .sort();
}

function readMigration(fileName: string): string {
  return readFileSync(`${migrationsDirectory}/${fileName}`, 'utf8');
}

let schemaCounter = 0;

// Applies migrations into a throwaway schema so the shared test database's own
// schema and fixtures are untouched.
async function inFreshSchema(work: (client: pg.Client) => Promise<void>): Promise<void> {
  const client = connection();
  schemaCounter += 1;
  const schema = `people_migration_${process.pid}_${schemaCounter}_${Math.floor(Math.random() * 1_000_000)}`;
  await client.query(`CREATE SCHEMA "${schema}"`);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await work(client);
  } finally {
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
  }
}

async function applyMigrations(client: pg.Client, files: string[]): Promise<void> {
  for (const fileName of files) {
    await client.query(readMigration(fileName));
  }
}

describe('the people migration against PostgreSQL', () => {
  beforeAll(async () => {
    if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
      throw new Error('Run this suite with npm run test:integration; the local PostgreSQL test launcher creates a disposable database and sets TEST_DATABASE_URL.');
    }
    database = new pg.Client({ connectionString: testDatabaseUrl });
    await database.connect();
  });

  afterAll(async () => {
    await database?.end();
  });

  it('gives a fresh database Default with no transaction', async () => {
    await inFreshSchema(async (client) => {
      await applyMigrations(client, migrationFilesThrough(10));

      const people = await client.query('SELECT name FROM people ORDER BY id');
      expect(people.rows).toEqual([{ name: 'Default' }]);
      const count = await client.query('SELECT count(*)::int AS count FROM transactions');
      expect(count.rows[0]).toEqual({ count: 0 });
    });
  });

  it('backfills an existing transaction to Default and makes the person required', async () => {
    await inFreshSchema(async (client) => {
      await applyMigrations(client, migrationFilesThrough(9));
      await client.query(`
        INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name)
        VALUES ('2026-02-03', '2026-02-03', -12.50, 'REWE Market', 'REWE')
      `);
      await client.query(`
        INSERT INTO import_runs (started_at, source, non_writing, outcome, rows_read, rows_already_stored, rows_written)
        VALUES ('2026-02-04T00:00:00Z', 'manual', false, 'success', 1, 0, 1)
      `);

      await applyMigrations(client, migrationFilesThrough(10).filter((fileName) => fileName.startsWith('0010')));

      const stored = await client.query(`
        SELECT p.name AS person
        FROM transactions AS t
        JOIN people AS p ON p.id = t.person_id
      `);
      expect(stored.rows).toEqual([{ person: 'Default' }]);

      const personColumn = await client.query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'transactions'
          AND column_name = 'person_id'
      `);
      expect(personColumn.rows[0]).toEqual({ is_nullable: 'NO' });

      const runColumn = await client.query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'import_runs'
          AND column_name = 'person_id'
      `);
      expect(runColumn.rows[0]).toEqual({ is_nullable: 'YES' });

      const run = await client.query('SELECT person_id FROM import_runs');
      expect(run.rows).toEqual([{ person_id: null }]);

      // The reference is required: a transaction cannot be written without one.
      await expect(
        client.query(`
          INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name)
          VALUES ('2026-02-05', '2026-02-05', -1.00, 'No owner', 'Nowhere')
        `),
      ).rejects.toMatchObject({ code: '23502' });
    });
  });

  it("keeps person names distinct ignoring case", async () => {
    await inFreshSchema(async (client) => {
      await applyMigrations(client, migrationFilesThrough(10));

      await client.query("INSERT INTO people (name) VALUES ('Anna')");
      await expect(client.query("INSERT INTO people (name) VALUES ('anna')")).rejects.toMatchObject({
        code: '23505',
      });

      const stored = await client.query('SELECT name FROM people ORDER BY id');
      expect(stored.rows).toEqual([{ name: 'Default' }, { name: 'Anna' }]);
    });
  });

  it('keeps an existing transaction otherwise unchanged', async () => {
    await inFreshSchema(async (client) => {
      await applyMigrations(client, migrationFilesThrough(9));
      await client.query(`
        INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account)
        VALUES ('2026-02-03', '2026-02-02', -12.50, 'REWE Market', 'REWE', 'DE00000000000000000000')
      `);
      const before = await client.query(`
        SELECT booking_date::text, value_date::text, amount::text, purpose, counterparty_name, counterparty_account
        FROM transactions
      `);

      await applyMigrations(client, migrationFilesThrough(10).filter((fileName) => fileName.startsWith('0010')));

      const after = await client.query(`
        SELECT booking_date::text, value_date::text, amount::text, purpose, counterparty_name, counterparty_account
        FROM transactions
      `);
      expect(after.rows).toEqual(before.rows);
      assert.equal(after.rows.length, 1);
    });
  });
});
