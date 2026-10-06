// The Easybank sync task. The nightly schedule runs it with no payload; the
// sync-start endpoint runs it with a 'ui' source. Either way it runs the same
// module the command-line command runs, through the server's shared database
// pool, and leaves a run record. Until EASYBANK_SYNC_WRITE is set to true it
// only reports what it would import, so the path can be watched on the Imports
// screen before it is trusted. EASYBANK_BASE_URL, when set, points the retrieval
// at a test bank instead of the real one.
//
// See openspec/changes/add-easybank-sync/specs/easybank-sync/spec.md
// and openspec/changes/add-easybank-sync-button/specs/easybank-sync/spec.md
import { defaultWindow, syncEasybank, syncSourceFromPayload } from '../../../shared/easybank-sync';

export default defineTask({
  meta: {
    name: 'easybank:sync',
    description: 'Import new Easybank Giro transactions through the shared import path',
  },
  async run({ payload }) {
    const window = defaultWindow(new Date());
    const baseUrl = process.env['EASYBANK_BASE_URL'];
    const result = await syncEasybank(useDatabase(), {
      user: process.env['EASYBANK_USER'] ?? null,
      pin: process.env['EASYBANK_PIN'] ?? null,
      from: window.from,
      to: window.to,
      dryRun: process.env['EASYBANK_SYNC_WRITE'] !== 'true',
      source: syncSourceFromPayload(payload),
      baseUrl: baseUrl === '' ? undefined : baseUrl,
    });

    if (result.status === 'failed') {
      console.error(`easybank sync failed: ${result.error}`);
    }

    return { result: result.status };
  },
});
