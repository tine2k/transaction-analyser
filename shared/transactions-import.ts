// The transaction import path, shared by the manual CSV importer, the manual
// Easybank sync command, and the nightly sync task. It reads a CSV source, checks
// the header, validates every row, classifies each row against what the table
// already holds, and writes only the surplus inside one transaction, so a repeated
// import of the same rows changes nothing and a statement that legitimately holds
// a transaction twice still produces two rows. Each newly written row is evaluated
// against the stored categories in the same transaction, so it lands with the
// category the matching rule selects rather than waiting for the next category
// change.
//
// It is deliberately framework-free: it takes a `pg` client or pool and a source,
// and imports nothing from Nuxt or the application. The command-line importer and
// the server task both import this module, so there is one implementation of the
// rules and no drift between them.
//
// The run record is separate from the import transaction: it is inserted when the
// run starts and updated when it ends, so a non-writing run and a failed import
// are recorded too, and a run killed mid-flight is left reading as in progress.
//
// See openspec/changes/add-easybank-sync/specs/transaction-csv-import/spec.md
// and openspec/changes/add-easybank-sync/specs/import-log/spec.md
import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse';
import type { Client, Pool, PoolClient } from 'pg';
import { matchingCategorySql } from './category-assignment.ts';

export const EXPECTED_HEADER = [
  'Date',
  'Value date',
  'Category',
  'Name',
  'Purpose',
  'Account',
  'Bank',
  'Amount',
  'Currency',
] as const;

export const DELIMITER = ';';
export const FIELD_COUNT = EXPECTED_HEADER.length;
const ACCEPTED_CURRENCY = 'EUR';
const DATE_FORM = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const AMOUNT_WITH_DECIMALS = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+$/;
const AMOUNT_WITHOUT_DECIMALS = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+)$/;
const AMOUNT_SHAPE_HINT =
  'expected a number with a comma as the decimal separator and periods as thousands separators, such as -1.234,56';
const ZERO_AMOUNT = /^0*(?:\.0*)?$/;

export type ImportSourceKind = 'manual' | 'scheduled' | 'ui';
export type ImportRunOutcome = 'in_progress' | 'success' | 'failed';

export type ImportRow = {
  line: number;
  bookingDate: string;
  valueDate: string;
  amount: string;
  purpose: string;
  counterpartyName: string;
  counterpartyAccount: string | null;
};

export type RowError = { line: number; reason: string };

export type CsvRecord = { fields: string[]; line: number; raw: string };

export type CsvSource =
  | { kind: 'path'; path: string }
  | { kind: 'text'; text: string; label: string };

export type ImportPlan = {
  rowsRead: number;
  rowsAlreadyStored: number;
  rowsWritten: number;
  rowsCategorised: number;
  newRows: ImportRow[];
};

export type Database = Client | Pool;
export type TransactionClient = Client | PoolClient;

// A failure that stops the whole run before any transaction row is written. It
// carries the number of data rows that had been read, so the run record can still
// say how far the import got.
export class ImportFailure extends Error {
  readonly rowsRead: number;

  constructor(message: string, rowsRead = 0) {
    super(message);
    this.name = 'ImportFailure';
    this.rowsRead = rowsRead;
  }
}

// A file whose rows were read but at least one was invalid. The whole file is
// refused and every offending row is carried for the caller to report.
export class InvalidRowsFailure extends ImportFailure {
  readonly errors: RowError[];

  constructor(errors: RowError[], rowsRead: number) {
    super(`${errors.length} invalid row${errors.length === 1 ? '' : 's'}`, rowsRead);
    this.name = 'InvalidRowsFailure';
    this.errors = errors;
  }
}

type FieldResult = { ok: true; value: string } | { ok: false; reason: string };

// Removes the credentials from a connection string that may appear inside an
// error message, so a printed or recorded failure never carries one.
export function redact(text: string): string {
  return text.replace(/:\/\/[^:@/\s]+:[^@/\s]*@/g, '://[redacted]@');
}

// The message of an error, with its driver code when the driver supplied one and
// the message does not already contain it. The fields pg adds to a connection
// error (severity, detail, hint) are included because they name the reason without
// naming the address.
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const failure = error as { message?: unknown; code?: unknown; severity?: unknown; detail?: unknown; hint?: unknown };
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

export function decodeStrictUtf8(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ImportFailure(
      `cannot read "${label}": the file is not valid UTF-8. Nothing was written, ` +
        'because decoding it leniently would store corrupted characters.',
    );
  }
}

async function readSource(source: CsvSource): Promise<{ text: string; label: string }> {
  if (source.kind === 'text') {
    return { text: source.text, label: source.label };
  }
  let bytes: Buffer;
  try {
    bytes = await readFile(source.path);
  } catch (error) {
    throw new ImportFailure(`cannot read "${source.path}": ${redact(describeError(error))}`);
  }
  return { text: decodeStrictUtf8(bytes, source.path), label: source.path };
}

export async function parseCsvText(text: string): Promise<CsvRecord[]> {
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

export function checkHeader(fields: string[]): void {
  const found = fields.map((field) => field.trim());
  if (found.length === FIELD_COUNT && found.every((name, index) => name === EXPECTED_HEADER[index])) {
    return;
  }
  throw new ImportFailure(
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

export function validateRow(fields: string[], line: number): ImportRow | RowError {
  if (fields.length !== FIELD_COUNT) {
    return {
      line,
      reason: `the row has ${fields.length} fields where the header names ${FIELD_COUNT}`,
    };
  }

  const [date, valueDate, , name, purpose, account, , amount, currency] = fields;

  const bookingDate = parseDate(date ?? '', 'Date');
  if (!bookingDate.ok) {
    return { line, reason: bookingDate.reason };
  }
  const bookedOn = parseDate(valueDate ?? '', 'Value date');
  if (!bookedOn.ok) {
    return { line, reason: bookedOn.reason };
  }
  const counterpartyName = checkRequired(name ?? '', 'Name');
  if (!counterpartyName.ok) {
    return { line, reason: counterpartyName.reason };
  }
  const purposeLine = checkRequired(purpose ?? '', 'Purpose');
  if (!purposeLine.ok) {
    return { line, reason: purposeLine.reason };
  }
  const money = parseAmount(amount ?? '');
  if (!money.ok) {
    return { line, reason: money.reason };
  }
  const currencyFound = (currency ?? '').trim();
  if (currencyFound !== ACCEPTED_CURRENCY) {
    return {
      line,
      reason:
        currencyFound === ''
          ? `the row states no currency, and a transaction is denominated in ${ACCEPTED_CURRENCY} only`
          : `currency "${currencyFound}" is not ${ACCEPTED_CURRENCY}, and a transaction is denominated in ${ACCEPTED_CURRENCY} only`,
    };
  }

  const counterpartyAccount = (account ?? '').trim();

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

// Validates every data row and collects all failures rather than stopping at the
// first, so the whole file is checked before anything is written.
export function validateRecords(records: CsvRecord[]): {
  rows: ImportRow[];
  errors: RowError[];
  dataRowCount: number;
} {
  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  let dataRowCount = 0;

  for (const record of records) {
    if (record.raw.trim() === '') {
      continue;
    }
    dataRowCount += 1;
    const outcome = validateRow(record.fields, record.line);
    if (isRowError(outcome)) {
      errors.push(outcome);
    } else {
      rows.push(outcome);
    }
  }

  return { rows, errors, dataRowCount };
}

// A row's identity for deduplication: the six stored values the file states. Two
// rows with the same identity describe the same transaction, so the file's count
// over the table's count is the number to write.
export function fingerprint(row: ImportRow): string {
  return JSON.stringify([
    row.bookingDate,
    row.valueDate,
    row.amount,
    row.purpose,
    row.counterpartyName,
    row.counterpartyAccount,
  ]);
}

// The pure allocation rule: for each fingerprint, the table already holds some
// rows and the file states some rows, so write the surplus of the file's count
// over the stored count and report the rest as already stored.
export function planWrites(
  fileCounts: Map<string, number>,
  storedCounts: Map<string, number>,
): { alreadyStored: number; toWrite: Map<string, number> } {
  let alreadyStored = 0;
  const toWrite = new Map<string, number>();

  for (const [key, count] of fileCounts) {
    const stored = storedCounts.get(key) ?? 0;
    const already = Math.min(count, stored);
    alreadyStored += already;
    const write = count - already;
    if (write > 0) {
      toWrite.set(key, write);
    }
  }

  return { alreadyStored, toWrite };
}

const STORED_COUNT_SQL = `
  SELECT count(*)::int AS count
  FROM transactions
  WHERE booking_date = $1
    AND value_date = $2
    AND amount = $3::numeric
    AND purpose = $4
    AND counterparty_name = $5
    AND counterparty_account IS NOT DISTINCT FROM $6
`;

const INSERT_SQL =
  'INSERT INTO transactions (booking_date, value_date, amount, purpose, counterparty_name, counterparty_account) ' +
  'VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';

// The write transaction takes a share lock on the categories table before it
// inserts, so a category create, edit, or delete cannot interleave with the
// assignment: either the category change commits first and the new rows are
// evaluated against it, or the import commits first and the category change's
// recompute sees the new rows. A category mutation takes a row-exclusive lock
// when it writes categories, which conflicts with this one.
const LOCK_CATEGORIES = 'LOCK TABLE categories IN SHARE MODE';

// The scoped assignment: only the rows this import wrote are evaluated, by the
// same matching rule the category mutations use. The update returns every row it
// touched, so the count of non-null category references is the categorised count.
const ASSIGN_IMPORTED_ROWS = `
  UPDATE transactions AS t
  SET category_id = ${matchingCategorySql()}
  WHERE t.id = ANY($1::bigint[])
  RETURNING t.category_id
`;

async function countStored(database: Database, row: ImportRow): Promise<number> {
  const result = await database.query(STORED_COUNT_SQL, [
    row.bookingDate,
    row.valueDate,
    row.amount,
    row.purpose,
    row.counterpartyName,
    row.counterpartyAccount,
  ]);
  return (result.rows[0] as { count: number }).count;
}

// A pool exposes its connection counts; a single client does not. Checking the
// property rather than the `connect` method matters, because a `pg.Client` also
// has a `connect` method, and calling it on an already-connected client throws.
function isPool(database: Database): database is Pool {
  return typeof (database as Pool).totalCount === 'number';
}

async function withTransaction<T>(
  database: Database,
  work: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  if (isPool(database)) {
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  await database.query('BEGIN');
  try {
    const result = await work(database);
    await database.query('COMMIT');
    return result;
  } catch (error) {
    await database.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

async function classifyRows(
  database: Database,
  rows: ImportRow[],
): Promise<{ newRows: ImportRow[]; alreadyStored: number }> {
  const fileCounts = new Map<string, number>();
  const representative = new Map<string, ImportRow>();
  for (const row of rows) {
    const key = fingerprint(row);
    fileCounts.set(key, (fileCounts.get(key) ?? 0) + 1);
    if (!representative.has(key)) {
      representative.set(key, row);
    }
  }

  const storedCounts = new Map<string, number>();
  for (const [key, row] of representative) {
    storedCounts.set(key, await countStored(database, row));
  }

  const allocation = planWrites(fileCounts, storedCounts);
  const newRows: ImportRow[] = [];
  for (const [key, count] of allocation.toWrite) {
    const row = representative.get(key);
    if (row !== undefined) {
      for (let index = 0; index < count; index += 1) {
        newRows.push(row);
      }
    }
  }

  return { newRows, alreadyStored: allocation.alreadyStored };
}

// Classifies already-validated rows against the table and, unless non-writing,
// writes the surplus and assigns the categories those new rows receive inside one
// transaction, so a failure leaves no row of the run behind and no category
// assigned by it. The CSV import and the Easybank sync both go through here, which
// is what keeps their dedupe, their assignment, and their run records identical.
export async function importRows(
  database: Database,
  rows: ImportRow[],
  options: { dryRun: boolean },
): Promise<ImportPlan> {
  const { newRows, alreadyStored } = await classifyRows(database, rows);
  const rowsWritten = options.dryRun ? 0 : newRows.length;
  let rowsCategorised = 0;

  if (!options.dryRun && newRows.length > 0) {
    await withTransaction(database, async (client) => {
      await client.query(LOCK_CATEGORIES);
      const writtenIds: string[] = [];
      for (const row of newRows) {
        const inserted = await client.query(INSERT_SQL, [
          row.bookingDate,
          row.valueDate,
          row.amount,
          row.purpose,
          row.counterpartyName,
          row.counterpartyAccount,
        ]);
        writtenIds.push((inserted.rows[0] as { id: string }).id);
      }
      const assigned = await client.query(ASSIGN_IMPORTED_ROWS, [writtenIds]);
      rowsCategorised = assigned.rows.filter(
        (assignedRow) => (assignedRow as { category_id: string | null }).category_id !== null,
      ).length;
    });
  }

  return {
    rowsRead: rows.length,
    rowsAlreadyStored: alreadyStored,
    rowsWritten,
    rowsCategorised,
    newRows,
  };
}

// Reads, validates, classifies, and (unless non-writing) writes one CSV source.
// The whole file is validated before the write transaction opens, and the surplus
// rows are written inside that one transaction, so a failure leaves no row of the
// run behind.
export async function importCsv(
  database: Database,
  source: CsvSource,
  options: { dryRun: boolean },
): Promise<ImportPlan> {
  const { text, label } = await readSource(source);
  const records = await parseCsvText(text);

  if (records.length === 0) {
    throw new ImportFailure(`"${label}" is empty, so it holds no transaction. Nothing was written.`);
  }

  checkHeader(records[0]!.fields);

  const { rows, errors, dataRowCount } = validateRecords(records.slice(1));
  if (errors.length > 0) {
    throw new InvalidRowsFailure(errors, dataRowCount);
  }

  return importRows(database, rows, options);
}

// Inserts a run record when an import starts and returns its identity. The record
// reads as in progress until it is finished.
export async function startImportRun(
  database: Database,
  options: { source: ImportSourceKind; nonWriting: boolean },
): Promise<string> {
  const result = await database.query(
    `INSERT INTO import_runs (started_at, source, non_writing, outcome, rows_read, rows_already_stored, rows_written, rows_categorised)
     VALUES (now(), $1, $2, 'in_progress', 0, 0, 0, 0)
     RETURNING id`,
    [options.source, options.nonWriting],
  );
  return String((result.rows[0] as { id: string }).id);
}

// Updates a run record with its finish time, outcome, counts, and failure reason.
export async function finishImportRun(
  database: Database,
  id: string,
  result: {
    outcome: Exclude<ImportRunOutcome, 'in_progress'>;
    rowsRead: number;
    rowsAlreadyStored: number;
    rowsWritten: number;
    rowsCategorised: number;
    error: string | null;
  },
): Promise<void> {
  await database.query(
    `UPDATE import_runs
     SET finished_at = now(), outcome = $2, rows_read = $3, rows_already_stored = $4,
         rows_written = $5, rows_categorised = $6, error = $7
     WHERE id = $1`,
    [
      id,
      result.outcome,
      result.rowsRead,
      result.rowsAlreadyStored,
      result.rowsWritten,
      result.rowsCategorised,
      result.error,
    ],
  );
}
