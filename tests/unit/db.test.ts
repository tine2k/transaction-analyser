// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pools = vi.hoisted(() => [] as Array<{
  connectionString: string;
  end: ReturnType<typeof vi.fn>;
}>);

vi.mock('pg', () => ({
  default: {
    Pool: class FakePool {
      readonly connectionString: string;
      readonly end = vi.fn(async () => undefined);

      constructor(options: { connectionString: string }) {
        this.connectionString = options.connectionString;
        pools.push(this);
      }
    },
  },
}));

import { endDatabasePool, useDatabase } from '../../server/utils/db';

describe('database pool lifecycle', () => {
  beforeEach(async () => {
    await endDatabasePool();
    pools.length = 0;
    delete process.env['DATABASE_URL'];
  });

  afterEach(async () => {
    await endDatabasePool();
    delete process.env['DATABASE_URL'];
  });

  it('does not create a pool until a database address is configured and requested', () => {
    expect(() => useDatabase()).toThrow('no database address');
    expect(pools).toHaveLength(0);

    process.env['DATABASE_URL'] = 'postgres://test:secret@127.0.0.1/test';
    const first = useDatabase();
    const second = useDatabase();

    expect(first).toBe(second);
    expect(pools).toHaveLength(1);
    expect(pools[0]?.connectionString).toBe('postgres://test:secret@127.0.0.1/test');
  });

  it('closes and resets the shared pool so a later request creates a fresh one', async () => {
    process.env['DATABASE_URL'] = 'postgres://test:secret@127.0.0.1/test';
    useDatabase();
    const firstPool = pools[0];

    await endDatabasePool();

    expect(firstPool?.end).toHaveBeenCalledOnce();
    useDatabase();
    expect(pools).toHaveLength(2);
  });
});
