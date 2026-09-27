// Lists every stored category for the management surface. It reads and writes
// nothing, and the listing is ordered by identity from smallest to largest so the
// order is total and stable.
//
// See openspec/changes/add-category-management/specs/category-management-api/spec.md
export default defineEventHandler(async () => {
  try {
    return await listCategories();
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
