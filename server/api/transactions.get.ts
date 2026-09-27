// The transactions read endpoint. It returns every stored transaction as a
// JSON array, ordered newest booking date first, with each transaction's
// category resolved from the categories table by following its reference.
// It runs a single SELECT and writes nothing: no row is created, altered, or
// deleted, and no category's regular expression is evaluated.
//
// The two dates are formatted in SQL rather than passed through, because the
// `pg` driver parses a `date` into a JavaScript Date, whose JSON form carries a
// time of day and can fall on the previous day in a negative-offset timezone.
// Formatting them here keeps the response a plain `YYYY-MM-DD` calendar date.
//
// See openspec/changes/add-transactions-read-endpoint/specs/transaction-read-api/spec.md
// and openspec/changes/add-transactions-read-endpoint/specs/backend-shell/spec.md
const SELECT_TRANSACTIONS = `
  SELECT t.id,
         to_char(t.booking_date, 'YYYY-MM-DD') AS booking_date,
         to_char(t.value_date, 'YYYY-MM-DD') AS value_date,
         t.amount,
         t.purpose,
         t.counterparty_name,
         t.counterparty_account,
         c.id AS category_id,
         c.name AS category_name
  FROM transactions AS t
  LEFT JOIN categories AS c ON c.id = t.category_id
  ORDER BY t.booking_date DESC, t.id DESC
`;

// The columns as the driver returns them: the bigint identities and the numeric
// amount arrive as strings, and the two dates have been formatted as text.
type TransactionRow = {
  id: string;
  booking_date: string;
  value_date: string;
  amount: string;
  purpose: string;
  counterparty_name: string;
  counterparty_account: string | null;
  category_id: string | null;
  category_name: string | null;
};

// A driver's error message can carry the host and port, which are parts of the
// connection string, and the backend-shell capability forbids any part of a
// connection string in a log line. The driver's error code (for example
// ECONNREFUSED, or a SQLSTATE such as 42P01) names none of those, so only the
// code is logged.
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '' ? code : 'unknown error';
}

export default defineEventHandler(async () => {
  // A missing DATABASE_URL is reported here and propagates as an error rather
  // than being answered as an empty transaction list.
  const database = useDatabase();

  let rows: TransactionRow[];
  try {
    const result = await database.query(SELECT_TRANSACTIONS);
    rows = result.rows as TransactionRow[];
  } catch (error) {
    // Only the error code is logged; the response carries a fixed message, so
    // no part of the connection string or any credential can reach the caller
    // or a log line.
    console.error(`could not read transactions: ${errorCode(error)}`);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'the transactions could not be read from the database',
    });
  }

  return rows.map((row) => ({
    id: row.id,
    bookingDate: row.booking_date,
    valueDate: row.value_date,
    amount: row.amount,
    purpose: row.purpose,
    counterpartyName: row.counterparty_name,
    counterpartyAccount: row.counterparty_account,
    category:
      row.category_id === null
        ? null
        : { id: row.category_id, name: row.category_name },
  }));
});
