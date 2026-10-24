// Person management: the read and write surface for the named owners of
// transactions. A person is a stable storage identity and a changeable name; the
// transaction count is derived from the transactions that reference the person and
// is never stored on the person. There is no delete and no operation that assigns a
// transaction to a person.
//
// The name is required, trimmed, and distinct ignoring letter case. The surface
// answers an invalid name as a refused request, a duplicate as a conflict, an
// unknown identity as a missing resource, and anything else as a fixed server
// failure that discloses no part of a connection string.
//
// See openspec/changes/add-people/specs/person-management-api/spec.md
import { useDatabase } from './db';

// A person as the management surface returns it. The count covers every
// transaction that references the person, across all time, including zero.
export type Person = {
  id: string;
  name: string;
  transactionCount: number;
};

// A refused create or rename, carrying the status the handler answers with.
export class PersonError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'PersonError';
    this.statusCode = statusCode;
  }
}

const SELECT_PEOPLE = `
  SELECT p.id, p.name, count(t.id)::int AS "transactionCount"
  FROM people AS p
  LEFT JOIN transactions AS t ON t.person_id = p.id
  GROUP BY p.id, p.name
  ORDER BY lower(p.name), p.id
`;

const INSERT_PERSON = `
  INSERT INTO people (name)
  VALUES ($1)
  RETURNING id, name
`;

// Renaming is one statement: the identity keeps its value and every transaction
// that references it keeps the reference. The count is derived in the same query,
// so a concurrent import cannot make the response disagree with the stored rows.
const RENAME_PERSON = `
  WITH renamed AS (
    UPDATE people
    SET name = $2
    WHERE id = $1
    RETURNING id, name
  )
  SELECT r.id, r.name, count(t.id)::int AS "transactionCount"
  FROM renamed AS r
  LEFT JOIN transactions AS t ON t.person_id = r.id
  GROUP BY r.id, r.name
`;

export async function listPeople(): Promise<Person[]> {
  const database = useDatabase();
  const result = await database.query(SELECT_PEOPLE);
  return result.rows as Person[];
}

export async function createPerson(input: unknown): Promise<Person> {
  const name = readName(input);
  const database = useDatabase();
  const inserted = await database.query(INSERT_PERSON, [name]);
  const row = inserted.rows[0] as { id: string; name: string };
  return { id: String(row.id), name: row.name, transactionCount: 0 };
}

export async function renamePerson(id: string, input: unknown): Promise<Person> {
  assertIdentity(id);
  const name = readName(input);
  const database = useDatabase();
  const updated = await database.query(RENAME_PERSON, [id, name]);
  const row = updated.rows[0] as Person | undefined;
  if (row === undefined) {
    throw new PersonError(404, 'no person carries that identity');
  }
  return { id: String(row.id), name: row.name, transactionCount: row.transactionCount };
}

// Maps a thrown value to the HTTP error a handler answers with. A refused request
// keeps its status; a duplicate name is a conflict; anything else is a failure
// whose log line carries only an error code, so no credential can reach a response
// or a log.
export function throwPersonHttpError(error: unknown): never {
  if (error instanceof PersonError) {
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
      message: 'a person with that name already exists',
    });
  }
  console.error(`could not complete the person request: ${errorCode(error)}`);
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'the person request could not be completed',
  });
}

// The name of a create or a rename: a string that is not empty after surrounding
// whitespace is stripped. The trimmed value is what is stored and compared. No
// maximum length is imposed.
function readName(input: unknown): string {
  if (typeof input !== 'object' || input === null) {
    throw new PersonError(400, 'a person needs a name');
  }
  const name = (input as { name?: unknown }).name;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new PersonError(400, 'a person needs a non-empty name');
  }
  return name.trim();
}

const IDENTITY = /^[0-9]+$/;

// A storage identity: a whole number rendered as a string that the bigint column
// can hold. Anything else names no person, so a rename of it is a missing resource.
function assertIdentity(id: string): void {
  if (!IDENTITY.test(id) || BigInt(id) > 9223372036854775807n) {
    throw new PersonError(404, 'no person carries that identity');
  }
}

function uniqueViolation(error: unknown): boolean {
  return errorCode(error) === '23505';
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '' ? code : 'unknown error';
}
