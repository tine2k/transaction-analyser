// Creates a category from a JSON body naming its name and its regular expressions.
// The name must be present and distinct, and every pattern must compile; the insert
// and the re-evaluation it triggers run in one transaction.
//
// A body that cannot be read is reported as a refused request rather than as a
// server failure.
//
// See openspec/changes/allow-multiple-category-expressions/specs/category-management-api/spec.md
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => undefined);
  try {
    const created = await createCategory(body);
    setResponseStatus(event, 201);
    return created;
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
