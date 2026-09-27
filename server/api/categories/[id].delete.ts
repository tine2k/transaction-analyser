// Deletes the category the identity names. Because the schema forbids deleting a
// category that a transaction references, the transactions that referenced it are
// first reassigned to the winning remaining category, or to no category, and then
// the category is removed. Both statements run in one transaction, so no transaction
// is ever left pointing at a category that no longer exists.
//
// See openspec/changes/add-category-management/specs/category-management-api/spec.md
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  try {
    await deleteCategory(id);
    setResponseStatus(event, 204);
    return null;
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
