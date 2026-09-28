// Previews how many stored transactions a candidate set of category date windows
// would claim: transactions whose booking date falls in a window and whose purpose
// line matches no stored category's expression. This is read-only: unlike create
// and edit, it does not store a category or trigger transaction reassignment.
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => undefined);
  try {
    return { count: await countWindowClaims(body) };
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
