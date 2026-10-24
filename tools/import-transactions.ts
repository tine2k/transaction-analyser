import pg from 'pg';
import {
  DELIMITER,
  EXPECTED_HEADER,
  ImportFailure,
  InvalidRowsFailure,
  describeError,
  finishImportRun,
  importCsv,
  redact,
  resolvePerson,
  setImportRunPerson,
  startImportRun,
} from '../shared/transactions-import.ts';
import type { ImportPlan, Person, RowError } from '../shared/transactions-import.ts';

type Options = { file: string | null; dsn: string | null; dryRun: boolean; person: string | null };

function parseOptions(argv: string[]): Options {
  const options: Options = { file: null, dsn: null, dryRun: false, person: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--person') {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error('--person needs a value');
      }
      options.person = value;
      index += 1;
    } else if (argument.startsWith('--person=')) {
      options.person = argument.slice('--person='.length);
    } else if (argument === '--dsn') {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error('--dsn needs a value');
      }
      options.dsn = value;
      index += 1;
    } else if (argument.startsWith('--dsn=')) {
      options.dsn = argument.slice('--dsn='.length);
    } else if (argument === '--help' || argument === '-h') {
      options.file = null;
    } else if (options.file === null) {
      options.file = argument;
    } else {
      throw new Error(`unexpected argument "${argument}"`);
    }
  }
  return options;
}

const USAGE = [
  'Usage: node tools/import-transactions.ts <file.csv> --person <name> [--dsn <connection-string>] [--dry-run]',
  '',
  '  <file.csv>            Path to the statement to import. It stays where it is;',
  '                        nothing is copied into the repository.',
  '  --person <name>       Required. The person the statement belongs to. The person',
  '                        must already exist; an import never creates one. The name',
  '                        is matched ignoring letter case.',
  '  --dsn <string>        Database to import into. Defaults to $DATABASE_URL.',
  '  --dry-run             Read and validate the file, report which rows are new',
  '                        and which are already stored for that person, and write',
  '                        nothing.',
  '',
  'The file must be UTF-8 and its header must be exactly:',
  EXPECTED_HEADER.join(DELIMITER),
  '',
  'A row already stored for the same person is skipped rather than imported again.',
  'The same row is new for another person.',
  'Each newly imported row is categorised by the categories stored at import time.',
].join('\n');

function reportErrors(errors: RowError[]): void {
  console.error(`${errors.length} invalid row${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) {
    console.error(`  line ${error.line}: ${error.reason}`);
  }
  console.error('\nNothing was written. Every row of the file has to be valid before any of it is stored.');
}

function showRows(rows: ImportPlan['newRows']): void {
  const width = rows.length.toString().length;
  for (const row of rows) {
    const number = row.line.toString().padStart(width, ' ');
    const account = row.counterpartyAccount ?? '(no account)';
    console.log(
      `  line ${number}  ${row.bookingDate}  ${row.valueDate}  ${row.amount}  ` +
        `${row.counterpartyName}  ${account}`,
    );
    console.log(`  ${' '.repeat(width + 7)}${row.purpose}`);
  }
}

function reportPlan(plan: ImportPlan, file: string, person: string, dryRun: boolean): void {
  if (plan.rowsRead === 0) {
    console.log(`"${file}" holds no transaction. Nothing was written.`);
    return;
  }

  if (dryRun) {
    console.log(
      `Dry run for ${person}: ${plan.rowsRead} data row${plan.rowsRead === 1 ? '' : 's'} read, ` +
        `${plan.rowsAlreadyStored} already stored, ${plan.newRows.length} would be written.`,
    );
    showRows(plan.newRows);
    return;
  }

  console.log(
    `Read ${plan.rowsRead} data row${plan.rowsRead === 1 ? '' : 's'} from "${file}" for ${person}, ` +
      `skipped ${plan.rowsAlreadyStored} already stored, and wrote ${plan.rowsWritten}.`,
  );
  console.log(`${plan.rowsCategorised} of the written rows received a category.`);
}

async function main(): Promise<number> {
  const options = parseOptions(process.argv.slice(2));

  if (options.file === null) {
    console.log(USAGE);
    return 0;
  }

  const dsn = options.dsn ?? process.env['DATABASE_URL'] ?? null;
  if (dsn === null || dsn === '') {
    throw new Error('no database address: pass --dsn or set DATABASE_URL');
  }

  const client = new pg.Client({ connectionString: dsn });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(`cannot reach the database: ${redact(describeError(error))}`);
  }

  try {
    const runId = await startImportRun(client, { source: 'manual', nonWriting: options.dryRun });

    let plan: ImportPlan;
    let person: Person;
    try {
      // The person is resolved before anything is read or written, and the run is
      // told which person it resolved. A missing or unknown person fails here and
      // is recorded as a failed run with no person.
      person = await resolvePerson(client, options.person ?? '');
      await setImportRunPerson(client, runId, person.id);
      plan = await importCsv(client, { kind: 'path', path: options.file }, { dryRun: options.dryRun, person });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const rowsRead = error instanceof ImportFailure ? error.rowsRead : 0;
      await finishImportRun(client, runId, {
        outcome: 'failed',
        rowsRead,
        rowsAlreadyStored: 0,
        rowsWritten: 0,
        rowsCategorised: 0,
        error: redact(reason),
      }).catch(() => undefined);
      throw error;
    }

    await finishImportRun(client, runId, {
      outcome: 'success',
      rowsRead: plan.rowsRead,
      rowsAlreadyStored: plan.rowsAlreadyStored,
      rowsWritten: plan.rowsWritten,
      rowsCategorised: plan.rowsCategorised,
      error: null,
    });

    reportPlan(plan, options.file, person.name, options.dryRun);
    return 0;
  } finally {
    await client.end();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  if (error instanceof InvalidRowsFailure) {
    reportErrors(error.errors);
    process.exitCode = 1;
  } else {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${redact(reason)}`);
    process.exitCode = 1;
  }
}
