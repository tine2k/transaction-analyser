// The import log read endpoint. It returns the most recent import runs as a JSON
// array, newest first, bounded to a fixed number so the response stays small as
// the log grows. It runs a single SELECT and writes nothing: no run is created,
// altered, or deleted, and no transaction is read.
//
// The timestamps are formatted in SQL as UTC instants rather than passed through,
// because the driver parses a `timestamptz` into a JavaScript Date and the JSON
// form would depend on the process time zone. Formatting them here keeps the
// response a plain ISO-8601 string.
//
// See openspec/changes/add-easybank-sync/specs/import-log/spec.md
// and openspec/changes/add-easybank-sync/specs/backend-shell/spec.md
const RECENT_RUN_LIMIT = 50;

const SELECT_RECENT_RUNS = `
  SELECT id,
         to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
         CASE
           WHEN finished_at IS NULL THEN NULL
           ELSE to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
         END AS finished_at,
         source,
         non_writing,
         outcome,
         rows_read,
         rows_already_stored,
         rows_written,
         rows_categorised,
         error
  FROM import_runs
  ORDER BY started_at DESC, id DESC
  LIMIT ${RECENT_RUN_LIMIT}
`;

// The columns as the driver returns them: the bigint identity arrives as a
// string, the timestamps have been formatted as text, and the counts are numbers.
type ImportRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  source: string;
  non_writing: boolean;
  outcome: string;
  rows_read: number;
  rows_already_stored: number;
  rows_written: number;
  rows_categorised: number;
  error: string | null;
};

// A driver's error message can carry the host and port, which are parts of the
// connection string, and the backend-shell capability forbids any part of a
// connection string in a log line. The driver's error code names none of those,
// so only the code is logged.
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '' ? code : 'unknown error';
}

export default defineEventHandler(async () => {
  // A missing DATABASE_URL is reported here and propagates as an error rather
  // than being answered as an empty log.
  const database = useDatabase();

  let rows: ImportRunRow[];
  try {
    const result = await database.query(SELECT_RECENT_RUNS);
    rows = result.rows as ImportRunRow[];
  } catch (error) {
    console.error(`could not read the import log: ${errorCode(error)}`);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'the import log could not be read from the database',
    });
  }

  return rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    source: row.source,
    nonWriting: row.non_writing,
    outcome: row.outcome,
    rowsRead: row.rows_read,
    rowsAlreadyStored: row.rows_already_stored,
    rowsWritten: row.rows_written,
    rowsCategorised: row.rows_categorised,
    error: row.error,
  }));
});
