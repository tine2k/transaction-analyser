// One definition of the category assignment rule, shared by the category
// management mutations in `server/utils/categories.ts` and the import path in
// `shared/transactions-import.ts`. It is deliberately framework-free: it exports
// SQL text and imports nothing, so the command-line importer and the server both
// build their statements from the same rule and cannot drift apart.
//
// The rule is two-tier. A category matches when at least one of its expressions
// matches the purpose line — using the database's case-insensitive match operator
// `~*`, matching a part of the line rather than anchoring to the whole of it — so
// the first scalar subquery tests existence across the category's expressions with
// `unnest`. A category covers a booking date when one of its inclusive from/to
// windows contains it, tested by the second subquery. `COALESCE` joins the tiers,
// so an expression match always wins and a window is consulted only when no
// expression matches any category. `ORDER BY c.id LIMIT 1` makes the smallest
// matching identity win, so the outcome is stable. The expression references the
// transaction row by the alias `t`.

export type MatchingCategoryOptions = {
  // A parameter placeholder, such as `$1`, naming the identity of a category to
  // exclude from the candidates. Used when a category is retired, so the
  // transactions that referenced it fall back to the remaining categories. The
  // caller controls this text and passes no user input through it.
  excludeCategoryId?: string;
};

export function matchingCategorySql(options: MatchingCategoryOptions = {}): string {
  const exclusion =
    options.excludeCategoryId === undefined ? '' : `c.id <> ${options.excludeCategoryId} AND `;

  return `
    COALESCE(
      (
        SELECT c.id
        FROM categories AS c
        WHERE ${exclusion}EXISTS (
          SELECT 1
          FROM unnest(c.patterns) AS expression
          WHERE t.purpose ~* expression
        )
        ORDER BY c.id
        LIMIT 1
      ),
      (
        SELECT c.id
        FROM categories AS c
        WHERE ${exclusion}EXISTS (
          SELECT 1
          FROM jsonb_array_elements(c.windows) AS date_window
          WHERE t.booking_date BETWEEN (date_window->>'from')::date AND (date_window->>'to')::date
        )
        ORDER BY c.id
        LIMIT 1
      )
    )
  `;
}
