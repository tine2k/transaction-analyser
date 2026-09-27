import pg from 'pg';

// One pool per server process, built on first use and handed to every consumer
// from here, so that no caller opens a connection of its own.
//
// The address is read from the environment here rather than in nuxt.config.ts,
// which is evaluated when the application is built: reading it at run time is
// what lets one build be pointed at any database by changing only the
// environment. It is the same variable the command-line importer reads.
//
// A pg.Pool opens no connection until a statement runs on it, so the server
// starts and serves with no database reachable. Nothing in the shell runs a
// statement, so the pool stays unopened.
//
// See openspec/changes/add-nuxt-application-shell/specs/backend-shell/spec.md
let pool: pg.Pool | null = null;

export function useDatabase(): pg.Pool {
  if (pool === null) {
    // The address is never included in the message: an error shown to a browser
    // or written to a log must not carry a credential.
    const address = process.env['DATABASE_URL'];
    if (address === undefined || address === '') {
      throw new Error('no database address: set DATABASE_URL in the environment');
    }
    pool = new pg.Pool({ connectionString: address });
  }
  return pool;
}

export async function endDatabasePool(): Promise<void> {
  const open = pool;
  pool = null;
  if (open !== null) {
    await open.end();
  }
}
