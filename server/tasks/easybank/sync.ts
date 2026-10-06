// The nightly Easybank sync. It runs the same module the command-line command
// runs, through the server's shared database pool, and leaves a run record either
// way. Until EASYBANK_SYNC_WRITE is set to true it only reports what it would
// import, so the nightly path can be watched on the Imports screen before it is
// trusted.
//
// See openspec/changes/add-easybank-sync/specs/easybank-sync/spec.md
import { defaultWindow, syncEasybank } from '../../../shared/easybank-sync';

export default defineTask({
  meta: {
    name: 'easybank:sync',
    description: 'Import new Easybank Giro transactions through the shared import path',
  },
  async run() {
    const window = defaultWindow(new Date());
    const result = await syncEasybank(useDatabase(), {
      user: process.env['EASYBANK_USER'] ?? null,
      pin: process.env['EASYBANK_PIN'] ?? null,
      from: window.from,
      to: window.to,
      dryRun: process.env['EASYBANK_SYNC_WRITE'] !== 'true',
      source: 'scheduled',
    });

    if (result.status === 'failed') {
      console.error(`easybank sync failed: ${result.error}`);
    }

    return { result: result.status };
  },
});
