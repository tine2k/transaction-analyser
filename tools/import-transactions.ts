import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse';
import pg from 'pg';

const EXPECTED_HEADER = [
  'Date',
  'Value date',
  'Category',
  'Name',
  'Purpose',
  'Account',
  'Bank',
  'Amount',
  'Currency',
];

const DELIMITER = ';';
const FIELD_COUNT = EXPECTED_HEADER.length;
const ACCEPTED_CURRENCY = 'EUR';
const DATE_FORM = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const AMOUNT_WITH_DECIMALS = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+$/;
const AMOUNT_WITHOUT_DECIMALS = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+)$/;
const AMOUNT_SHAPE_HINT =
  'expected a number with a comma as the decimal separator and periods as thousands separators, such as -1.234,56';
const ZERO_AMOUNT = /^0*(?:\.0*)?$/;

type ImportRow = {
  line: number;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
};

type RowError = { line: number; reason: string };

type CsvRecord = { fields: string[]; line: number; raw: string };

type FieldResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

type ConnectionFailure = {
  message?: unknown;
  code?: unknown;
  severity?: unknown;
  detail?: unknown;
  hint?: unknown;
};

type Options = { file: string | null; dsn: string | null; dryRun: boolean };

const INSERT_SQL =
  'INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account) ' +
  'VALUES ($1, $2, $3, $4, $5, $6)';

function parseOptions(argv: string[]): Options {
  const options: Options = { file: null, dsn: null, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') {
      options.dryRun = true;
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
  'Usage: node tools/import-transactions.ts <file.csv> [--dsn <connection-string>] [--dry-run]',
  '',
  '  <file.csv>            Path to the statement to import. It stays where it is;',
  '                        nothing is copied into the repository.',
  '  --dsn <string>        Database to import into. Defaults to $DATABASE_URL.',
  '  --dry-run             Read and validate the file, report what would be written,',
  '                        and contact no database at all.',
  '',
  'The file must be UTF-8 and its header must be exactly:',
  EXPECTED_HEADER.join(DELIMITER),
  '',
  'Every imported transaction is written with no category.',
].join('\n');

function redact(text: string): string {
  return text.replace(/:\/\/[^:@/\s]+:[^@/\s]*@/g, '://[redacted]@');
}

async function readFileStrictUtf8(path: string): Promise<string> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch (error) {
    throw new Error(`cannot read "${path}": ${redact(describe(error))}`);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      `cannot read "${path}": the file is not valid UTF-8. Nothing was written, ` +
        'because decoding it leniently would store corrupted characters.',
    );
  }
}

async function readRecords(path: string): Promise<CsvRecord[]> {
  const text = await readFileStrictUtf8(path);
  const parser = parse(text, {
    delimiter: DELIMITER,
    bom: true,
    info: true,
    raw: true,
    relax_column_count: true,
    relax_quotes: false,
    skip_empty_lines: false,
    skip_records_with_empty_values: false,
  });

  const collected: CsvRecord[] = [];
  let previousEndLine = 0;
  for await (const entry of parser) {
    const info = entry.info as { lines: number };
    const record = entry as unknown as { record: string[]; raw: string };
    collected.push({
      fields: record.record,
      line: previousEndLine + 1,
      raw: record.raw,
    });
    previousEndLine = info.lines;
  }
  return collected;
}

function checkHeader(fields: string[]): void {
  const found = fields.map((field) => field.trim());
  if (found.length === FIELD_COUNT && found.every((name, index) => name === EXPECTED_HEADER[index])) {
    return;
  }
  throw new Error(
    `the header of this file is not one this import recognises.\n` +
      `  expected: ${EXPECTED_HEADER.join(DELIMITER)}\n` +
      `  found:    ${found.length === 0 ? '<no columns>' : found.join(DELIMITER)}\n` +
      'Nothing was written.',
  );
}

function parseDate(raw: string, column: string): FieldResult {
  const text = raw.trim();
  const match = DATE_FORM.exec(text);
  if (match === null) {
    return { ok: false, reason: `${column} "${raw}" is not a date; expected day, month, year as DD.MM.YYYY` };
  }
  const [, day, month, year] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12) {
    return { ok: false, reason: `${column} "${raw}" has a month that is not on the calendar` };
  }
  const daysInMonth = new Date(Date.UTC(Number(year), monthNumber, 0)).getUTCDate();
  if (dayNumber < 1 || dayNumber > daysInMonth) {
    return { ok: false, reason: `${column} "${raw}" has a day that is not on the calendar` };
  }
  return { ok: true, value: `${year}-${month}-${day}` };
}

function parseAmount(raw: string): FieldResult {
  const text = raw.trim();
  let value: string;
  if (text.includes(',')) {
    if (!AMOUNT_WITH_DECIMALS.test(text)) {
      return { ok: false, reason: `amount "${raw}" is not a number in this file's format; ${AMOUNT_SHAPE_HINT}` };
    }
    value = text.replace(/\./g, '').replace(',', '.');
  } else {
    if (!AMOUNT_WITHOUT_DECIMALS.test(text)) {
      return {
        ok: false,
        reason: `amount "${raw}" is not a number in this file's format; ${AMOUNT_SHAPE_HINT}`,
      };
    }
    value = text.replace(/\./g, '');
  }
  if (ZERO_AMOUNT.test(value)) {
    return { ok: false, reason: `amount "${raw}" is zero, and a zero amount carries no direction` };
  }
  return { ok: true, value };
}

function checkRequired(raw: string, column: string): FieldResult {
  const text = raw.trim();
  if (text === '') {
    return { ok: false, reason: `${column} is empty, and the export has lost the value` };
  }
  return { ok: true, value: text };
}

function validateRow(fields: string[], line: number): ImportRow | RowError {
  if (fields.length !== FIELD_COUNT) {
    return {
      line,
      reason: `the row has ${fields.length} fields where the header names ${FIELD_COUNT}`,
    };
  }

  const [date, valueDate, , name, purpose, account, , amount, currency] = fields;

  const bookingDate = parseDate(date, 'Date');
  if (!bookingDate.ok) {
    return { line, reason: bookingDate.reason };
  }
  const bookedOn = parseDate(valueDate, 'Value date');
  if (!bookedOn.ok) {
    return { line, reason: bookedOn.reason };
  }
  const counterpartyName = checkRequired(name, 'Name');
  if (!counterpartyName.ok) {
    return { line, reason: counterpartyName.reason };
  }
  const purposeLine = checkRequired(purpose, 'Purpose');
  if (!purposeLine.ok) {
    return { line, reason: purposeLine.reason };
  }
  const money = parseAmount(amount);
  if (!money.ok) {
    return { line, reason: money.reason };
  }
  const currencyFound = currency.trim();
  if (currencyFound !== ACCEPTED_CURRENCY) {
    return {
      line,
      reason:
        currencyFound === ''
          ? `the row states no currency, and a transaction is denominated in ${ACCEPTED_CURRENCY} only`
          : `currency "${currencyFound}" is not ${ACCEPTED_CURRENCY}, and a transaction is denominated in ${ACCEPTED_CURRENCY} only`,
    };
  }

  const counterpartyAccount = account.trim();

  return {
    line,
    bookingDate: bookingDate.value,
    valueDate: bookedOn.value,
    amount: money.value,
    purpose: purposeLine.value,
    counterpartyName: counterpartyName.value,
    counterpartyAccount: counterpartyAccount === '' ? null : counterpartyAccount,
  };
}

function isRowError(value: ImportRow | RowError): value is RowError {
  return 'reason' in value;
}

function reportErrors(errors: RowError[]): void {
  console.error(`${errors.length} invalid row${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) {
    console.error(`  line ${error.line}: ${error.reason}`);
  }
  console.error('\nNothing was written. Every row of the file has to be valid before any of it is stored.');
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const failure = error as ConnectionFailure;
  const parts: string[] = [];
  const message = typeof failure.message === 'string' ? failure.message.trim() : '';
  if (message !== '') {
    parts.push(message);
  }
  if (typeof failure.code === 'string' && failure.code !== '' && !message.includes(failure.code)) {
    parts.push(failure.code);
  }
  for (const field of ['severity', 'detail', 'hint'] as const) {
    const value = failure[field];
    if (typeof value === 'string' && value.trim() !== '') {
      parts.push(value.trim());
    }
  }
  return parts.length === 0 ? error.name : parts.join(' — ');
}

async function writeRows(dsn: string, rows: ImportRow[]): Promise<number> {
  const client = new pg.Client({ connectionString: dsn });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(`cannot reach the database: ${redact(describe(error))}`);
  }
  try {
    await client.query('BEGIN');
    let written = 0;
    for (const row of rows) {
      await client.query(INSERT_SQL, [
        row.bookingDate,
        row.valueDate,
        row.amount,
        row.purpose,
        row.counterpartyName,
        row.counterpartyAccount,
      ]);
      written += 1;
    }
    await client.query('COMMIT');
    return written;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw new Error(
      `the import failed and was rolled back, so no row of it remains: ${redact(describe(error))}`,
    );
  } finally {
    await client.end();
  }
}

function showRows(rows: ImportRow[]): void {
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

async function main(): Promise<number> {
  const options = parseOptions(process.argv.slice(2));

  if (options.file === null) {
    console.log(USAGE);
    return 0;
  }

  const records = await readRecords(options.file);

  if (records.length === 0) {
    console.error(`"${options.file}" is empty, so it holds no transaction. Nothing was written.`);
    return 1;
  }

  checkHeader(records[0]!.fields);

  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  let readCount = 0;

  for (const record of records.slice(1)) {
    if (record.raw.trim() === '') {
      continue;
    }
    readCount += 1;
    const outcome = validateRow(record.fields, record.line);
    if (isRowError(outcome)) {
      errors.push(outcome);
    } else {
      rows.push(outcome);
    }
  }

  if (errors.length > 0) {
    reportErrors(errors);
    return 1;
  }

  if (rows.length === 0) {
    console.log(`"${options.file}" holds no transaction. Nothing was written.`);
    return 0;
  }

  if (options.dryRun) {
    console.log(`Dry run: ${readCount} data row${readCount === 1 ? '' : 's'} would be written. No database was contacted.`);
    showRows(rows);
    return 0;
  }

  const dsn = options.dsn ?? process.env['DATABASE_URL'] ?? null;
  if (dsn === null || dsn === '') {
    throw new Error('no database address: pass --dsn or set DATABASE_URL');
  }

  const written = await writeRows(dsn, rows);
  console.log(
    `Read ${readCount} data row${readCount === 1 ? '' : 's'} from "${options.file}" and wrote ${written}.`,
  );
  console.log('Every imported transaction is uncategorised.');
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${redact(reason)}`);
  process.exitCode = 1;
}
