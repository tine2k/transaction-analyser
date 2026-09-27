// Replaces the name and the regular expressions of the category the identity names,
// then re-evaluates every transaction so stored references agree with the new
// patterns. The update and the re-evaluation run in one transaction.
//
// See openspec/changes/allow-multiple-category-expressions/specs/category-management-api/spec.md
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const body = await readBody(event).catch(() => undefined);
  try {
    return await editCategory(id, body);
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
