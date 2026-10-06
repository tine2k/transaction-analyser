import pg from 'pg';
import { describeError, redact } from '../shared/transactions-import.ts';
import { defaultWindow, syncEasybank } from '../shared/easybank-sync.ts';

type Options = { from: string | null; to: string | null; dsn: string | null; write: boolean };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseOptions(argv: string[]): Options {
  const options: Options = { from: null, to: null, dsn: null, write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') {
      options.write = true;
    } else if (argument === '--dry-run') {
      options.write = false;
    } else if (argument === '--from' || argument === '--to') {
      const value = argv[index + 1];
      if (value === undefined || !ISO_DATE.test(value)) {
        throw new Error(`${argument} needs a date as YYYY-MM-DD`);
      }
      if (argument === '--from') {
        options.from = value;
      } else {
        options.to = value;
      }
      index += 1;
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
      options.from = null;
      options.to = null;
      options.dsn = null;
      options.write = false;
      return options;
    } else {
      throw new Error(`unexpected argument "${argument}"`);
    }
  }
  return options;
}

const USAGE = [
  'Usage: node tools/easybank-sync.ts [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--dsn <connection-string>] [--write]',
  '',
  'Reads the Easybank Giro account\'s transaction list, imports the rows that are',
  'new, and records the run. It is non-writing by default: without --write it',
  'reports what it would import and changes no transaction.',
  '',
  '  --from <date>         Window start, inclusive. Defaults to the first day of',
  '                        the preceding calendar quarter.',
  '  --to <date>           Window end, inclusive. Defaults to today.',
  '  --dsn <string>        Database to import into. Defaults to $DATABASE_URL.',
  '  --write               Write the new rows. Without it the run only reports.',
  '',
  'Credentials come from EASYBANK_USER and EASYBANK_PIN in the environment.',
].join('\n');

async function main(): Promise<number> {
  const options = parseOptions(process.argv.slice(2));
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  const dsn = options.dsn ?? process.env['DATABASE_URL'] ?? null;
  if (dsn === null || dsn === '') {
    throw new Error('no database address: pass --dsn or set DATABASE_URL');
  }

  const window = defaultWindow(new Date());
  const from = options.from ?? window.from;
  const to = options.to ?? window.to;
  const user = process.env['EASYBANK_USER'] ?? null;
  const pin = process.env['EASYBANK_PIN'] ?? null;

  if (user === null || user === '' || pin === null || pin === '') {
    console.log('EASYBANK_USER and EASYBANK_PIN are not set; no sync was run and no run was recorded.');
    return 0;
  }

  const client = new pg.Client({ connectionString: dsn });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(`cannot reach the database: ${redact(describeError(error))}`);
  }

  try {
    const result = await syncEasybank(client, {
      user,
      pin,
      from,
      to,
      dryRun: !options.write,
      source: 'manual',
    });

    if (result.status === 'unconfigured') {
      console.log('EASYBANK_USER and EASYBANK_PIN are not set; no sync was run and no run was recorded.');
      return 0;
    }
    if (result.status === 'failed') {
      console.error(`Error: ${result.error}`);
      return 1;
    }

    const plan = result.plan;
    if (options.write) {
      console.log(
        `Read ${plan.rowsRead} row${plan.rowsRead === 1 ? '' : 's'} for ${from}..${to}, ` +
          `skipped ${plan.rowsAlreadyStored} already stored, and wrote ${plan.rowsWritten}.`,
      );
    } else {
      console.log(
        `Dry run: ${plan.rowsRead} row${plan.rowsRead === 1 ? '' : 's'} read for ${from}..${to}, ` +
          `${plan.rowsAlreadyStored} already stored, ${plan.newRows.length} would be written.`,
      );
    }
    return 0;
  } finally {
    await client.end();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${redact(reason)}`);
  process.exitCode = 1;
}
