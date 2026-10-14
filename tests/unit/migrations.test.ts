// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('node-pg-migrate', () => ({ runner: vi.fn(async () => []) }));

import {
  decideStartup,
  migrationCountThrough,
  parseBaseline,
  runStartupMigrations,
  versionOfMigrationFile,
} from '../../server/utils/migrations';

const files = [
  '0001_transactions.sql',
  '0002_transaction_categories.sql',
  '0003_category_patterns.sql',
];

describe('migration version parsing', () => {
  it('normalises a zero-padded or a plain version', () => {
    expect(parseBaseline('0008')).toEqual({ state: 'version', version: 8 });
    expect(parseBaseline('8')).toEqual({ state: 'version', version: 8 });
  });

  it('reports an unset baseline for an undefined or empty value', () => {
    expect(parseBaseline(undefined)).toEqual({ state: 'unset' });
    expect(parseBaseline('')).toEqual({ state: 'unset' });
    expect(parseBaseline('   ')).toEqual({ state: 'unset' });
  });

  it('reports a malformed baseline as invalid', () => {
    expect(parseBaseline('latest')).toEqual({ state: 'invalid' });
    expect(parseBaseline('8a')).toEqual({ state: 'invalid' });
    expect(parseBaseline('-1')).toEqual({ state: 'invalid' });
  });

  it('reads the version from a migration file name', () => {
    expect(versionOfMigrationFile('0008_category_expense_type.sql')).toBe(8);
    expect(versionOfMigrationFile('0010_extra.sql')).toBe(10);
    expect(versionOfMigrationFile('readme.sql')).toBeNull();
  });

  it('counts the files up to and including a version', () => {
    expect(migrationCountThrough(files, 2)).toBe(2);
    expect(migrationCountThrough(files, 3)).toBe(3);
    expect(migrationCountThrough(files, 0)).toBe(0);
  });
});

describe('startup decision', () => {
  it('applies normally when the history records migrations', () => {
    expect(
      decideStartup({
        historyEmpty: false,
        schemaEmpty: false,
        baseline: { state: 'version', version: 3 },
        files,
      }),
    ).toEqual({ kind: 'apply' });
  });

  it('applies normally on an empty database even with a baseline set', () => {
    expect(
      decideStartup({
        historyEmpty: true,
        schemaEmpty: true,
        baseline: { state: 'version', version: 3 },
        files,
      }),
    ).toEqual({ kind: 'apply' });
  });

  it('refuses an unadopted schema without a baseline', () => {
    expect(
      decideStartup({
        historyEmpty: true,
        schemaEmpty: false,
        baseline: { state: 'unset' },
        files,
      }),
    ).toEqual({ kind: 'refuse-unadopted' });
  });

  it('refuses a malformed baseline', () => {
    expect(
      decideStartup({
        historyEmpty: true,
        schemaEmpty: false,
        baseline: { state: 'invalid' },
        files,
      }),
    ).toEqual({ kind: 'refuse-unknown-baseline' });
  });

  it('refuses a baseline naming no local file', () => {
    expect(
      decideStartup({
        historyEmpty: true,
        schemaEmpty: false,
        baseline: { state: 'version', version: 99 },
        files,
      }),
    ).toEqual({ kind: 'refuse-unknown-baseline' });
  });

  it('baselines up to and including the named version', () => {
    expect(
      decideStartup({
        historyEmpty: true,
        schemaEmpty: false,
        baseline: { state: 'version', version: 2 },
        files,
      }),
    ).toEqual({ kind: 'baseline', count: 2 });
  });
});

describe('startup runner', () => {
  it('refuses to run without a database address', async () => {
    await expect(runStartupMigrations({ databaseUrl: '' })).rejects.toThrow('DATABASE_URL');
  });
});
