// Category management and assignment.
//
// Categories are listed, created, edited, and deleted here, and every change to the
// category set re-evaluates the transactions it can affect. The matching rule is
// the database's case-insensitive match operator `~*`, which matches a part of the
// purpose line rather than anchoring to the whole of it; the winning category is the
// matching one with the smallest identity. Validation compiles a candidate pattern
// by probing the same operator, so the engine that validates is the engine that
// evaluates.
//
// Each mutation and the re-evaluation it triggers run inside one transaction on a
// connection taken from the shared pool, so stored references are never observed
// half-changed.
//
// See openspec/changes/add-category-management/specs/category-management-api/spec.md
// and openspec/changes/add-category-management/specs/category-assignment/spec.md
import type { Pool, PoolClient } from 'pg';
import { useDatabase } from './db';

// A category as the management surface returns it: the identity rendered as a
// string, and the two domain elements.
export type Category = { id: string; name: string; pattern: string };

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
  SELECT id, name, pattern
  FROM categories
  ORDER BY id
`;

const INSERT_CATEGORY = `
  INSERT INTO categories (name, pattern)
  VALUES ($1, $2)
  RETURNING id, name, pattern
`;

const UPDATE_CATEGORY = `
  UPDATE categories
  SET name = $2, pattern = $3
  WHERE id = $1
  RETURNING id, name, pattern
`;

const DELETE_CATEGORY = 'DELETE FROM categories WHERE id = $1';

// The global recompute. The scalar subquery is null when no category matches, and
// `ORDER BY c.id LIMIT 1` makes the smallest matching identity win. It is run after
// a create or an edit and is idempotent.
const RECOMPUTE_ASSIGNMENTS = `
  UPDATE transactions AS t
  SET category_id = (
    SELECT c.id
    FROM categories AS c
    WHERE t.purpose ~* c.pattern
    ORDER BY c.id
    LIMIT 1
  )
`;

// The reassignment that lets a category be deleted. The category being retired is
// excluded from the candidate set, and only the transactions that referenced it are
// touched. Once this has run, no transaction references the category, so the delete
// no longer violates the foreign key.
const REASSIGN_RETIRING_CATEGORY = `
  UPDATE transactions
  SET category_id = (
    SELECT c.id
    FROM categories AS c
    WHERE c.id <> $1 AND purpose ~* c.pattern
    ORDER BY c.id
    LIMIT 1
  )
  WHERE category_id = $1
`;

// Compiles a candidate pattern, and matches nothing meaningful: the empty string is
// only there to give the operator an input. An uncompilable pattern raises 2201B.
const COMPILE_PATTERN = "SELECT '' ~* $1 AS ok";

const IDENTITY = /^[0-9]+$/;

export async function listCategories(): Promise<Category[]> {
  const database = useDatabase();
  const result = await database.query(SELECT_CATEGORIES);
  return result.rows as Category[];
}

export async function createCategory(input: unknown): Promise<Category> {
  const { name, pattern } = readCategoryInput(input);
  const database = useDatabase();
  await assertPatternCompiles(database, pattern);

  return inTransaction(database, async (client) => {
    const inserted = await client.query(INSERT_CATEGORY, [name, pattern]);
    await client.query(RECOMPUTE_ASSIGNMENTS);
    return inserted.rows[0] as Category;
  });
}

export async function editCategory(id: string, input: unknown): Promise<Category> {
  assertIdentity(id);
  const { name, pattern } = readCategoryInput(input);
  const database = useDatabase();
  await assertPatternCompiles(database, pattern);

  return inTransaction(database, async (client) => {
    const updated = await client.query(UPDATE_CATEGORY, [id, name, pattern]);
    if (updated.rowCount === 0) {
      throw new CategoryError(404, 'no category carries that identity');
    }
    await client.query(RECOMPUTE_ASSIGNMENTS);
    return updated.rows[0] as Category;
  });
}

export async function deleteCategory(id: string): Promise<void> {
  assertIdentity(id);
  const database = useDatabase();

  await inTransaction(database, async (client) => {
    await client.query(REASSIGN_RETIRING_CATEGORY, [id]);
    const deleted = await client.query(DELETE_CATEGORY, [id]);
    if (deleted.rowCount === 0) {
      throw new CategoryError(404, 'no category carries that identity');
    }
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

function readCategoryInput(input: unknown): { name: string; pattern: string } {
  if (typeof input !== 'object' || input === null) {
    throw new CategoryError(400, 'a category needs a name and a pattern');
  }
  const name = (input as { name?: unknown }).name;
  const pattern = (input as { pattern?: unknown }).pattern;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new CategoryError(400, 'a category needs a non-empty name');
  }
  if (typeof pattern !== 'string') {
    throw new CategoryError(400, 'a category needs a pattern');
  }
  return { name, pattern };
}

function assertIdentity(id: string): void {
  if (!IDENTITY.test(id)) {
    throw new CategoryError(404, 'no category carries that identity');
  }
}

async function assertPatternCompiles(database: Pool, pattern: string): Promise<void> {
  try {
    await database.query(COMPILE_PATTERN, [pattern]);
  } catch (error) {
    // 2201B is Postgres' invalid-regular-expression SQLSTATE. A different failure,
    // such as an unreachable database, is rethrown so it is reported as one.
    if (errorCode(error) === '2201B') {
      throw new CategoryError(400, 'the pattern is not a usable regular expression');
    }
    throw error;
  }
}

function uniqueViolation(error: unknown): boolean {
  return errorCode(error) === '23505';
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '' ? code : 'unknown error';
}
