// Refuses to start without the person the Easybank sync imports into.
//
// EASYBANK_PERSON is required: the sync never guesses a person, so a process
// without it would have no destination for the transactions it retrieves. The
// check runs at module scope for the same reason the migrations run does — Nitro
// imports plugin modules before it creates the application, so the process exits
// without binding a port instead of serving an application that cannot sync.
//
// See openspec/changes/require-easybank-sync-person/specs/easybank-sync/spec.md
import { requirePersonFromEnv } from '../../shared/easybank-sync';

try {
  requirePersonFromEnv(process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[config] ${message}`);
  process.exit(1);
}

export default defineNitroPlugin(() => {});
