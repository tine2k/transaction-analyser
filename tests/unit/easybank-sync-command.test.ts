// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// The sync command is the TypeScript entry point `npm run sync` runs. The
// deployed project runs it with Node 24, which loads TypeScript itself; this test
// drives the same file through the project's vite-node runner so the command's
// own exit code and output are observed on any local Node build.
//
// See openspec/changes/require-easybank-sync-person/specs/easybank-sync/spec.md

const command = 'node_modules/.bin/vite-node';

function run(args: string[], environment: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, ...environment };
  if (!('EASYBANK_PERSON' in environment)) {
    delete env['EASYBANK_PERSON'];
  }
  // Clearing the address proves the person is refused before any database step:
  // a run that passed the person check would fail with the address message.
  delete env['DATABASE_URL'];

  const result = spawnSync(command, ['tools/easybank-sync.ts', ...args], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

describe('the sync command without a usable person', () => {
  it('exits non-zero and names the variable when it is absent', () => {
    const result = run([]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('EASYBANK_PERSON is not set');
    expect(result.output).not.toContain('no database address');
  });

  it('exits non-zero and names the variable when it is blank', () => {
    const result = run([], { EASYBANK_PERSON: '   ' });

    expect(result.status).toBe(1);
    expect(result.output).toContain('EASYBANK_PERSON is not set');
    expect(result.output).not.toContain('no database address');
  });

  it('reaches the database step once the person is usable', () => {
    const result = run([], { EASYBANK_PERSON: 'Anna' });

    expect(result.status).toBe(1);
    expect(result.output).toContain('no database address');
  });

  it('still prints its usage without the variable', () => {
    const result = run(['--help']);

    expect(result.status).toBe(0);
    expect(result.output).toContain('Usage:');
    expect(result.output).toContain('EASYBANK_PERSON is required');
    expect(result.output).not.toMatch(/defaults to\s+Default/i);
  });
});
