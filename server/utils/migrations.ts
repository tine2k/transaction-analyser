// Startup database migrations.
//
// Pending migrations are applied through node-pg-migrate's programmatic runner
// while the server starts, so a database is never served half-migrated. The run
// uses its own short-lived connection rather than the shared pool in
// server/utils/db.ts, and records what it applies in the `pgmigrations` table.
// A database that already holds a schema but no history is adopted once through
// MIGRATE_BASELINE: the files up to the named version are recorded as applied
// without being executed, and later files are applied normally.
//
// See openspec/changes/add-startup-database-migrations/specs/database-migrations/spec.md
import { readdirSync } from 'node:fs';
import pg from 'pg';
import { runner } from 'node-pg-migrate';
import { describeError, redact } from '../../shared/transactions-import';

export const migrationsDirectory = 'db/migrations';
export const migrationsTable = 'pgmigrations';

export type Baseline =
  | { state: 'unset' }
  | { state: 'invalid' }
  | { state: 'version'; version: number };

export function parseBaseline(value: string | undefined): Baseline {
  if (value === undefined || value.trim() === '') {
    return { state: 'unset' };
  }
  const text = value.trim();
  if (!/^\d+$/.test(text)) {
    return { state: 'invalid' };
  }
  return { state: 'version', version: Number(text) };
}

export function versionOfMigrationFile(fileName: string): number | null {
  const match = /^(\d+)/.exec(fileName);
  return match === null ? null : Number(match[1]);
}

export function migrationCountThrough(files: string[], version: number): number {
  return files.filter((file) => {
    const fileVersion = versionOfMigrationFile(file);
    return fileVersion !== null && fileVersion <= version;
  }).length;
}

export function listMigrationFiles(directory: string): string[] {
  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();
}

export type StartupDecision =
  | { kind: 'apply' }
  | { kind: 'baseline'; count: number }
  | { kind: 'refuse-unadopted' }
  | { kind: 'refuse-unknown-baseline' };

export function decideStartup(input: {
  historyEmpty: boolean;
  schemaEmpty: boolean;
  baseline: Baseline;
  files: string[];
}): StartupDecision {
  const { historyEmpty, schemaEmpty, files } = input;
  const baseline = input.baseline;

  // A recorded history, or a database with no schema at all, needs no adoption.
  if (!historyEmpty || schemaEmpty) {
    return { kind: 'apply' };
  }
  if (baseline.state === 'unset') {
    return { kind: 'refuse-unadopted' };
  }
  if (baseline.state === 'invalid') {
    return { kind: 'refuse-unknown-baseline' };
  }
  const matched = files.some((file) => versionOfMigrationFile(file) === baseline.version);
  if (!matched) {
    return { kind: 'refuse-unknown-baseline' };
  }
  return { kind: 'baseline', count: migrationCountThrough(files, baseline.version) };
}

type DatabaseState = { historyEmpty: boolean; schemaEmpty: boolean };

async function readDatabaseState(databaseUrl: string): Promise<DatabaseState> {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
  } catch {
    // The driver's message names the host and port; a startup log must not.
    throw new Error('the database named by DATABASE_URL cannot be reached');
  }
  try {
    const state = await client.query<{ has_history: boolean; other_tables: number }>(
      `SELECT to_regclass('public.${migrationsTable}') IS NOT NULL AS has_history,
              (SELECT count(*)::int FROM pg_catalog.pg_tables
                WHERE schemaname = 'public' AND tablename <> '${migrationsTable}') AS other_tables`,
    );
    const row = state.rows[0];
    if (row === undefined) {
      throw new Error('the database did not report its schema state');
    }
    let historyCount = 0;
    if (row.has_history) {
      const history = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM public.${migrationsTable}`,
      );
      historyCount = history.rows[0]?.count ?? 0;
    }
    return { historyEmpty: historyCount === 0, schemaEmpty: row.other_tables === 0 };
  } finally {
    await client.end();
  }
}

// The message of a failed migration, with credentials, addresses, and user names
// removed, so a startup log line names the failure without disclosing any part of
// the connection.
function startupErrorText(error: unknown): string {
  return redact(describeError(error))
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g, '[address]')
    .replace(/\b(user|role) "[^"]*"/gi, '$1 "[redacted]"');
}

async function runMigrations(
  databaseUrl: string,
  directory: string,
  extra: { fake?: boolean; count?: number },
): Promise<void> {
  try {
    await runner({
      databaseUrl,
      dir: directory,
      migrationsTable,
      direction: 'up',
      checkOrder: true,
      advisoryLockMode: 'wait',
      logger: {
        info: (message) => console.log(`[migrations] ${message}`),
        warn: (message) => console.warn(`[migrations] ${message}`),
        error: (message) => console.error(`[migrations] ${message}`),
      },
      ...extra,
    });
  } catch (error) {
    throw new Error(`the pending migrations could not be applied: ${startupErrorText(error)}`);
  }
}

export async function runStartupMigrations(
  options: { databaseUrl?: string; directory?: string } = {},
): Promise<void> {
  const databaseUrl = options.databaseUrl ?? process.env['DATABASE_URL'];
  if (databaseUrl === undefined || databaseUrl.trim() === '') {
    throw new Error(
      'DATABASE_URL is not set: set it to the database address before starting the application',
    );
  }
  const directory = options.directory ?? migrationsDirectory;
  const files = listMigrationFiles(directory);
  const state = await readDatabaseState(databaseUrl);
  const baseline = parseBaseline(process.env['MIGRATE_BASELINE']);

  if (!state.historyEmpty && baseline.state !== 'unset') {
    console.warn(
      '[migrations] MIGRATE_BASELINE is ignored because the database already records applied migrations',
    );
  }

  const decision = decideStartup({ ...state, baseline, files });
  if (decision.kind === 'refuse-unadopted') {
    throw new Error(
      'the database already holds a schema but no migration history: set MIGRATE_BASELINE to the highest applied version (for example 0008) and start again',
    );
  }
  if (decision.kind === 'refuse-unknown-baseline') {
    throw new Error(
      'MIGRATE_BASELINE does not name a version of any migration file in db/migrations: correct it and start again',
    );
  }
  if (decision.kind === 'baseline') {
    console.log(
      `[migrations] adopting the existing schema: recording ${decision.count} migration file(s) as applied without executing them`,
    );
    await runMigrations(databaseUrl, directory, { fake: true, count: decision.count });
  }
  await runMigrations(databaseUrl, directory, {});
}
