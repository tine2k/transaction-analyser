// Appends one literal pattern to the category the identity names. The text is
// escaped server-side, the append is atomic, and a real change re-evaluates the
// stored transactions in the same transaction. The response carries the updated
// category and whether a pattern was added.
//
// See openspec/changes/add-transaction-pattern-shortcut/specs/category-management-api/spec.md
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const body = await readBody(event).catch(() => undefined);
  try {
    return await appendPattern(id, body);
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
