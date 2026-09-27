// Previews how many stored transactions match candidate category expressions.
// This is read-only: unlike create and edit, it does not store a category or
// trigger transaction reassignment.
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => undefined);
  try {
    return { count: await countCategoryMatches(body) };
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
