// Category management and assignment.
//
// Categories are listed, created, edited, and deleted here, and every change to the
// category set re-evaluates the transactions it can affect. A category holds zero or
// more regular expressions and zero or more date windows, with at least one of the
// two. It matches a purpose line when any expression matches — using the database's
// case-insensitive match operator `~*`, matching a part of the line rather than
// anchoring to the whole of it — and it covers a booking date when one of its
// inclusive from/to windows contains it. Expressions are considered first: a date
// window is applied only when no category's expression matches. Among matching
// categories the winning one has the smallest identity. Validation compiles every
// candidate expression by probing the same operator, so the engine that validates is
// the engine that evaluates, and refuses a window set that overlaps a stored one so
// the calendar is partitioned.
//
// Each mutation and the re-evaluation it triggers run inside one transaction on a
// connection taken from the shared pool, so stored references are never observed
// half-changed.
//
// A category can also gain one literal pattern at a time: the transaction
// shortcut sends text a user selected, and `appendPattern` escapes it so the
// stored expression matches that text literally. The append is one conditional
// UPDATE, so a stale client cannot overwrite another tab's patterns, windows,
// or hidden flag.
//
// Every mutation takes a transaction-scoped advisory lock before it touches
// data. The re-evaluation reads the whole category set, so two concurrent
// mutations could otherwise interleave their re-evaluations and leave the final
// assignments reflecting only one of them.
//
// See openspec/changes/allow-multiple-category-expressions/specs/category-management-api/spec.md
// and openspec/changes/allow-multiple-category-expressions/specs/category-assignment/spec.md
import type { Pool, PoolClient } from 'pg';
import { matchingCategorySql } from '../../shared/category-assignment';
import { escapeLiteralPattern } from '../../shared/literal-pattern';
import { useDatabase } from './db';

// A category's date window: two full calendar dates at day precision, both
// inclusive, tested against a transaction's booking date. It is one of the
// category's domain elements, held together with the others on the category's row.
export type CategoryWindow = { from: string; to: string };

// A category as the management surface returns it: the identity rendered as a
// string, and the four domain elements — the name, every regular expression, the
// hidden flag that takes the category out of the analysis views, and the date
// windows that cover a bounded period.
export type Category = {
  id: string;
  name: string;
  patterns: string[];
  hidden: boolean;
  windows: CategoryWindow[];
};

// A create or an edit request that the surface refused, carrying the status the
// caller should answer with. It is thrown so a handler can map it in one place.
export class CategoryError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'CategoryError';
    this.statusCode = statusCode;
  }
}

const SELECT_CATEGORIES = `
  SELECT id, name, patterns, hidden, windows
  FROM categories
  ORDER BY id
`;

const SELECT_CATEGORY = `
  SELECT id, name, patterns, hidden, windows
  FROM categories
  WHERE id = $1
`;

// One advisory-lock key shared by every category mutation. The value is
// arbitrary but must not collide with another advisory lock in this
// application. It is taken inside the write transaction and released when the
// transaction ends.
const CATEGORY_MUTATION_LOCK_KEY = 20261007;

const INSERT_CATEGORY = `
  INSERT INTO categories (name, patterns, hidden, windows)
  VALUES ($1, $2, $3, $4::jsonb)
  RETURNING id, name, patterns, hidden, windows
`;

const UPDATE_CATEGORY = `
  UPDATE categories
  SET name = $2, patterns = $3, hidden = $4, windows = $5::jsonb
  WHERE id = $1
  RETURNING id, name, patterns, hidden, windows
`;

// Appends one escaped literal to a category, but only when the category does
// not already store it. The guard makes the append idempotent and atomic: the
// row is extended in place rather than replaced from a client-side snapshot, so
// a concurrent append to the same category cannot be lost.
const APPEND_PATTERN = `
  UPDATE categories
  SET patterns = patterns || $2::text
  WHERE id = $1 AND NOT patterns @> ARRAY[$2::text]
  RETURNING id, name, patterns, hidden, windows
`;

const DELETE_CATEGORY = 'DELETE FROM categories WHERE id = $1';

// The preview counts each transaction once, even if multiple candidate
// expressions match its purpose line or counterparty name. Stored categories and
// assignments are ignored.
const COUNT_MATCHING_TRANSACTIONS = `
  SELECT count(*)::text AS count
  FROM transactions AS t
  WHERE EXISTS (
    SELECT 1
    FROM unnest($1::text[]) AS candidate(pattern)
    WHERE t.purpose ~* candidate.pattern OR t.counterparty_name ~* candidate.pattern
  )
`;

// The window preview counts the transactions a candidate window set would claim:
// its booking date falls inclusively in at least one window, and no stored
// category's expression matches its purpose line or counterparty name. The
// exclusion mirrors the first tier of the recompute, so a transaction an
// expression explains is never claimed by a window; `count(*)` counts each
// transaction once even when several windows cover it. It reads only.
const COUNT_CLAIMED_TRANSACTIONS = `
  SELECT count(*)::text AS count
  FROM transactions AS t
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements($1::jsonb) AS candidate(win)
    WHERE t.booking_date BETWEEN (candidate.win->>'from')::date AND (candidate.win->>'to')::date
  )
  AND NOT EXISTS (
    SELECT 1
    FROM categories AS c
    CROSS JOIN LATERAL unnest(c.patterns) AS expression(pattern)
    WHERE t.purpose ~* expression.pattern OR t.counterparty_name ~* expression.pattern
  )
`;

// The global recompute: every stored transaction is assigned the category the
// shared matching rule selects. It is run after a create or an edit and is
// idempotent.
const RECOMPUTE_ASSIGNMENTS = `
  UPDATE transactions AS t
  SET category_id = ${matchingCategorySql()}
`;

// The on-demand re-categorisation: every stored transaction is assigned the
// category the shared matching rule selects, and only the rows whose reference
// actually changes are updated and returned, so the driver's row count is the
// number of changed transactions. It is idempotent: an immediate repeat changes
// and reports nothing.
const RECATEGORISE_TRANSACTIONS = `
  UPDATE transactions AS t
  SET category_id = ${matchingCategorySql()}
  WHERE t.category_id IS DISTINCT FROM (${matchingCategorySql()})
  RETURNING 1
`;

// The reassignment that lets a category be deleted. The category being retired is
// excluded from the candidate set, and only the transactions that referenced it are
// touched. It follows the same two-tier rule as the recompute, so a transaction may
// fall back to a remaining category's date window when no remaining expression
// matches. Once this has run, no transaction references the category, so the delete
// no longer violates the foreign key.
const REASSIGN_RETIRING_CATEGORY = `
  UPDATE transactions AS t
  SET category_id = ${matchingCategorySql({ excludeCategoryId: '$1' })}
  WHERE t.category_id = $1
`;

// Rejects a candidate window set that overlaps a stored window. `$1` is the
// candidate windows as JSON; `$2` is the identity of the category being edited, or
// null on a create, so the edited category's own stored windows are excluded because
// an edit replaces them. Two inclusive day ranges overlap when neither ends before
// the other begins, so a shared endpoint day counts. The first branch checks the
// candidate windows against each other; the second checks them against every other
// stored category. It runs inside the write transaction so a rejection leaves no
// change and a concurrent write cannot slip between the check and the write.
const FIND_OVERLAPPING_WINDOW = `
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS left_window(win, position),
         jsonb_array_elements($1::jsonb) WITH ORDINALITY AS right_window(win, position)
    WHERE left_window.position < right_window.position
      AND (left_window.win->>'from')::date <= (right_window.win->>'to')::date
      AND (right_window.win->>'from')::date <= (left_window.win->>'to')::date
  ) OR EXISTS (
    SELECT 1
    FROM categories AS c
    CROSS JOIN LATERAL jsonb_array_elements(c.windows) AS stored_window(win)
    WHERE ($2::bigint IS NULL OR c.id <> $2)
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements($1::jsonb) AS candidate_window(win)
        WHERE (candidate_window.win->>'from')::date <= (stored_window.win->>'to')::date
          AND (stored_window.win->>'from')::date <= (candidate_window.win->>'to')::date
      )
  ) AS overlaps
`;

// Compiles a candidate expression, and matches nothing meaningful: the empty string
// is only there to give the operator an input. An uncompilable expression raises
// 2201B.
const COMPILE_PATTERN = "SELECT '' ~* $1 AS ok";

const IDENTITY = /^[0-9]+$/;

export async function listCategories(): Promise<Category[]> {
  const database = useDatabase();
  const result = await database.query(SELECT_CATEGORIES);
  return result.rows as Category[];
}

export async function countCategoryMatches(input: unknown): Promise<number> {
  const patterns = readPatterns(input);
  const database = useDatabase();
  await assertPatternsCompile(database, patterns);

  const result = await database.query(COUNT_MATCHING_TRANSACTIONS, [patterns]);
  const count = Number(result.rows[0]?.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('the transaction match count is outside the supported range');
  }
  return count;
}

// Previews the transactions a literal text matches. The text is escaped by the
// same function the append uses, so what is counted is what would be stored. It
// reads only: no category is created or changed and no transaction is
// re-evaluated.
export async function countLiteralMatches(input: unknown): Promise<number> {
  const pattern = escapeLiteralPattern(readLiteralText(input));
  const database = useDatabase();

  const result = await database.query(COUNT_MATCHING_TRANSACTIONS, [[pattern]]);
  const count = Number(result.rows[0]?.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('the transaction match count is outside the supported range');
  }
  return count;
}

// Previews the transactions a candidate window set would claim. It reads only:
// unlike create and edit, it stores nothing and triggers no reassignment. It
// validates the windows exactly as a write does, but deliberately does not apply
// the stored non-overlap rule, because it creates no stored window and overlapping
// candidates are counted once.
export async function countWindowClaims(input: unknown): Promise<number> {
  if (typeof input !== 'object' || input === null) {
    throw new CategoryError(400, 'a preview needs at least one date window');
  }
  const windows = readWindows(input);
  if (windows.length === 0) {
    throw new CategoryError(400, 'a preview needs at least one date window');
  }

  const database = useDatabase();
  const result = await database.query(COUNT_CLAIMED_TRANSACTIONS, [JSON.stringify(windows)]);
  const count = Number(result.rows[0]?.count);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('the transaction match count is outside the supported range');
  }
  return count;
}

export async function createCategory(input: unknown): Promise<Category> {
  const { name, patterns, hidden, windows } = readCategoryInput(input);
  const database = useDatabase();
  await assertPatternsCompile(database, patterns);

  return inTransaction(database, async (client) => {
    await lockCategoryMutations(client);
    await assertWindowsDoNotOverlap(client, windows, null);
    const inserted = await client.query(INSERT_CATEGORY, [
      name,
      patterns,
      hidden,
      JSON.stringify(windows),
    ]);
    await client.query(RECOMPUTE_ASSIGNMENTS);
    return inserted.rows[0] as Category;
  });
}

export async function editCategory(id: string, input: unknown): Promise<Category> {
  assertIdentity(id);
  const { name, patterns, hidden, windows } = readCategoryInput(input);
  const database = useDatabase();
  await assertPatternsCompile(database, patterns);

  return inTransaction(database, async (client) => {
    await lockCategoryMutations(client);
    await assertWindowsDoNotOverlap(client, windows, id);
    const updated = await client.query(UPDATE_CATEGORY, [
      id,
      name,
      patterns,
      hidden,
      JSON.stringify(windows),
    ]);
    if (updated.rowCount === 0) {
      throw new CategoryError(404, 'no category carries that identity');
    }
    await client.query(RECOMPUTE_ASSIGNMENTS);
    return updated.rows[0] as Category;
  });
}

// Appends one literal pattern to the category the identity names. The text is
// escaped so the stored expression matches it literally, and the conditional
// update makes the append atomic and idempotent. A real change re-evaluates the
// stored transactions in the same transaction; an append that stores nothing
// changes nothing and reports that.
export async function appendPattern(
  id: string,
  input: unknown,
): Promise<{ category: Category; added: boolean }> {
  assertIdentity(id);
  const pattern = escapeLiteralPattern(readLiteralText(input));
  const database = useDatabase();

  return inTransaction(database, async (client) => {
    await lockCategoryMutations(client);
    const updated = await client.query(APPEND_PATTERN, [id, pattern]);
    if ((updated.rowCount ?? 0) > 0) {
      await client.query(RECOMPUTE_ASSIGNMENTS);
      return { category: updated.rows[0] as Category, added: true };
    }

    // The update matched no row: either the category does not exist, or it
    // already stores the pattern. The select tells the two apart.
    const existing = await client.query(SELECT_CATEGORY, [id]);
    if ((existing.rowCount ?? 0) === 0) {
      throw new CategoryError(404, 'no category carries that identity');
    }
    return { category: existing.rows[0] as Category, added: false };
  });
}

export async function deleteCategory(id: string): Promise<void> {
  assertIdentity(id);
  const database = useDatabase();

  await inTransaction(database, async (client) => {
    await lockCategoryMutations(client);
    await client.query(REASSIGN_RETIRING_CATEGORY, [id]);
    const deleted = await client.query(DELETE_CATEGORY, [id]);
    if (deleted.rowCount === 0) {
      throw new CategoryError(404, 'no category carries that identity');
    }
  });
}

// Re-evaluates every stored transaction against the stored categories on demand
// and answers with the number whose category changed. It takes the same
// transaction-scoped lock every category mutation takes, so the category set it
// reads cannot be changed underneath it, and it writes only category references:
// no category, no run record, and no report is stored. An import may run
// concurrently because it evaluates its own new rows with the same rule.
export async function recategoriseTransactions(): Promise<number> {
  const database = useDatabase();

  return inTransaction(database, async (client) => {
    await lockCategoryMutations(client);
    const updated = await client.query(RECATEGORISE_TRANSACTIONS);
    return updated.rowCount ?? 0;
  });
}

// Maps a thrown value to the HTTP error a handler should answer with. A refused
// request keeps its own status; a duplicate name is a conflict; anything else is a
// failure whose log line carries only an error code, so no part of a connection
// string can reach a response or a log.
export function throwCategoryHttpError(error: unknown): never {
  if (error instanceof CategoryError) {
    throw createError({
      statusCode: error.statusCode,
      statusMessage: error.statusCode === 404 ? 'Not Found' : 'Bad Request',
      message: error.message,
    });
  }
  if (uniqueViolation(error)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'a category with that name already exists',
    });
  }
  console.error(`could not complete the category request: ${errorCode(error)}`);
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'the category request could not be completed',
  });
}

// Serializes every mutation that changes the category set, so the re-evaluation
// one mutation triggers cannot read a category set another mutation is
// concurrently changing. The lock is transaction-scoped: the commit or rollback
// the caller performs releases it.
async function lockCategoryMutations(client: PoolClient): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [CATEGORY_MUTATION_LOCK_KEY]);
}

async function inTransaction<T>(
  database: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
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

function readCategoryInput(input: unknown): {
  name: string;
  patterns: string[];
  hidden: boolean;
  windows: CategoryWindow[];
} {
  if (typeof input !== 'object' || input === null) {
    throw new CategoryError(400, 'a category needs a name and at least one pattern or date window');
  }
  const name = (input as { name?: unknown }).name;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new CategoryError(400, 'a category needs a non-empty name');
  }
  const patterns = readOptionalPatterns(input);
  const windows = readWindows(input);
  if (patterns.length === 0 && windows.length === 0) {
    throw new CategoryError(400, 'a category needs at least one pattern or date window');
  }
  return { name, patterns, windows, hidden: readHidden(input) };
}

// The expressions of a create or an edit. Unlike the preview, a category may carry
// no expression when it carries at least one date window, so an absent value means
// no expressions and an empty list is accepted; only a shape that is not a list of
// strings is refused here. The at-least-one rule spans expressions and windows and
// is enforced by the caller.
function readOptionalPatterns(input: unknown): string[] {
  const patterns = (input as { patterns?: unknown }).patterns;
  if (patterns === undefined) {
    return [];
  }
  if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== 'string')) {
    throw new CategoryError(400, 'every pattern must be a string');
  }
  return patterns as string[];
}

// The date windows of a create or an edit. An absent value means no windows,
// because create and edit replace the stored category. A present value must be a
// list of objects holding exactly `from` and `to`, each a real day-precision
// calendar date, and `from` must not be later than `to`.
function readWindows(input: unknown): CategoryWindow[] {
  const windows = (input as { windows?: unknown }).windows;
  if (windows === undefined) {
    return [];
  }
  if (!Array.isArray(windows)) {
    throw new CategoryError(400, 'the date windows must be a list');
  }
  return windows.map((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new CategoryError(400, 'every date window must be an object with a from and a to date');
    }
    const keys = Object.keys(entry);
    if (keys.length !== 2 || !keys.includes('from') || !keys.includes('to')) {
      throw new CategoryError(400, 'every date window must hold exactly a from and a to date');
    }
    const from = (entry as { from?: unknown }).from;
    const to = (entry as { to?: unknown }).to;
    if (
      typeof from !== 'string' ||
      !isCalendarDate(from) ||
      typeof to !== 'string' ||
      !isCalendarDate(to)
    ) {
      throw new CategoryError(400, 'a date window needs a from and a to as full YYYY-MM-DD dates');
    }
    if (from > to) {
      throw new CategoryError(400, 'a date window must not start after it ends');
    }
    return { from, to };
  });
}

// A full day-precision calendar date: a four-digit year, a two-digit month and day,
// and a day that exists in that month, so 2026-02-30 is refused. A plain regex would
// accept the impossible day; the Date round-trip rejects it.
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isCalendarDate(value: string): boolean {
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Refuses a candidate window set that overlaps a stored window. The check runs on
// the write transaction's connection so a rejected request changes nothing and a
// concurrent write cannot create an overlap between the check and the write. The
// edited category's own stored windows are excluded, because an edit replaces them.
// An empty candidate set cannot overlap, so it skips the query.
async function assertWindowsDoNotOverlap(
  client: PoolClient,
  windows: CategoryWindow[],
  editedId: string | null,
): Promise<void> {
  if (windows.length === 0) {
    return;
  }
  const result = await client.query(FIND_OVERLAPPING_WINDOW, [JSON.stringify(windows), editedId]);
  if (result.rows[0]?.overlaps === true) {
    throw new CategoryError(400, "a date window overlaps another category's window");
  }
}

// The hidden flag is optional in the body. Absent means visible, because a create
// and an edit replace the stored category and a category is visible by default. A
// value that is present and not a boolean is refused rather than coerced.
function readHidden(input: unknown): boolean {
  const hidden = (input as { hidden?: unknown }).hidden;
  if (hidden === undefined) {
    return false;
  }
  if (typeof hidden !== 'boolean') {
    throw new CategoryError(400, 'the hidden flag must be a boolean');
  }
  return hidden;
}

// The literal text of an append or a literal preview. It must be a string whose
// trimmed form holds at least three characters; the trim means surrounding
// whitespace neither counts toward the length nor reaches the stored pattern.
function readLiteralText(input: unknown): string {
  if (typeof input !== 'object' || input === null) {
    throw new CategoryError(400, 'a literal pattern needs at least three characters of text');
  }
  const text = (input as { text?: unknown }).text;
  if (typeof text !== 'string') {
    throw new CategoryError(400, 'the pattern text must be a string');
  }
  const trimmed = text.trim();
  if ([...trimmed].length < 3) {
    throw new CategoryError(400, 'the pattern text must be at least three characters');
  }
  return trimmed;
}

function readPatterns(input: unknown): string[] {
  if (typeof input !== 'object' || input === null) {
    throw new CategoryError(400, 'a category needs a name and one or more patterns');
  }
  const patterns = (input as { patterns?: unknown }).patterns;
  if (!Array.isArray(patterns) || patterns.length === 0) {
    throw new CategoryError(400, 'a category needs at least one pattern');
  }
  if (patterns.some((pattern) => typeof pattern !== 'string')) {
    throw new CategoryError(400, 'every pattern must be a string');
  }
  return patterns as string[];
}

function assertIdentity(id: string): void {
  if (!IDENTITY.test(id)) {
    throw new CategoryError(404, 'no category carries that identity');
  }
}

// Compiles every candidate expression, so no expression is stored that the
// assignment cannot apply. The first uncompilable one refuses the whole request.
async function assertPatternsCompile(database: Pool, patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    try {
      await database.query(COMPILE_PATTERN, [pattern]);
    } catch (error) {
      // 2201B is Postgres' invalid-regular-expression SQLSTATE. A different failure,
      // such as an unreachable database, is rethrown so it is reported as one.
      if (errorCode(error) === '2201B') {
        throw new CategoryError(400, 'a pattern is not a usable regular expression');
      }
      throw error;
    }
  }
}

function uniqueViolation(error: unknown): boolean {
  return errorCode(error) === '23505';
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '' ? code : 'unknown error';
}
