// Sets or clears the manual category assignment of the named transactions as one
// all-or-nothing unit and answers with the number the operation wrote. A stored
// category identity pins each named transaction to it; a null category clears the
// manual assignment and immediately re-evaluates the named transactions with the
// matching rule. A refused request changes nothing, and a failure is reported as
// an error rather than as a success.
//
// See openspec/changes/add-manual-category-assignment/specs/manual-category-assignment/spec.md
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => undefined);
  try {
    return { updated: await assignTransactionCategories(body) };
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
