// Replaces the name and the regular expression of the category the identity names,
// then re-evaluates every transaction so stored references agree with the new
// pattern. The update and the re-evaluation run in one transaction.
//
// See openspec/changes/add-category-management/specs/category-management-api/spec.md
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const body = await readBody(event).catch(() => undefined);
  try {
    return await editCategory(id, body);
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
