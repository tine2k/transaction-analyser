// Applies pending migrations while the server starts, before it serves a request.
//
// Nitro calls plugin functions synchronously and does not await the promise they
// return, so the run is awaited at module scope instead: Nitro imports plugin
// modules before it creates the application, which makes this module's evaluation
// — and therefore the server's readiness — wait for the migrations. A failure
// exits the process non-zero without serving.
//
// See openspec/changes/add-startup-database-migrations/specs/database-migrations/spec.md
import { runStartupMigrations } from '../utils/migrations';

try {
  await runStartupMigrations();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[migrations] ${message}`);
  process.exit(1);
}

export default defineNitroPlugin(() => {});
