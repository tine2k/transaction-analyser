// Previews how many stored transactions a literal text matches. The text is
// escaped server-side by the same function the append uses. This is read-only:
// unlike create and edit, it stores no category and triggers no transaction
// reassignment.
//
// See openspec/changes/add-transaction-pattern-shortcut/specs/category-management-api/spec.md
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => undefined);
  try {
    return { count: await countLiteralMatches(body) };
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
