// The sync-start endpoint. It starts the same Nitro task the nightly schedule
// runs, through the task runner's guard: a request that arrives while a run is
// in progress joins that run instead of starting a second one, so two sync runs
// never overlap. The answer carries the run's outcome. A failed run is a
// recorded domain outcome, not an HTTP failure — its reason is on the import
// log; only a failure to start the run at all is an HTTP error.
//
// The payload names the 'ui' source so the recorded run is distinguishable from
// the nightly and command-line runs.
//
// See openspec/changes/add-easybank-sync-button/specs/easybank-sync/spec.md
// and openspec/changes/add-easybank-sync-button/specs/backend-shell/spec.md

// A driver's error message can carry the host and port, which are parts of the
// connection string, and the backend-shell capability forbids any part of a
// connection string in a log line. The driver's error code names none of those,
// so only the code is logged.
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '' ? code : 'unknown error';
}

function couldNotStart(): never {
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'the sync could not be started',
  });
}

export default defineEventHandler(async () => {
  let outcome: unknown;
  try {
    const result = await runTask('easybank:sync', { payload: { source: 'ui' } });
    outcome = result.result;
  } catch (error) {
    console.error(`easybank sync could not be started: ${errorCode(error)}`);
    couldNotStart();
  }

  if (outcome !== 'success' && outcome !== 'failed' && outcome !== 'unconfigured') {
    console.error('easybank sync answered no known outcome');
    couldNotStart();
  }

  return { status: outcome };
});
