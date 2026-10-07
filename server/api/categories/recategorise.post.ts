// Re-evaluates every stored transaction against the stored categories and answers
// with the number whose category changed. It records no import run and stores no
// report, so the count exists only in this answer.
export default defineEventHandler(async () => {
  try {
    return { changed: await recategoriseTransactions() };
  } catch (error) {
    throwCategoryHttpError(error);
  }
});
