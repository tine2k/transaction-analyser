// Lists every stored person with the number of transactions that reference each
// one, ordered by name ignoring case and then by identity. It reads and writes
// nothing, and an empty list is a success rather than a failure.
//
// See openspec/changes/add-people/specs/person-management-api/spec.md
export default defineEventHandler(async () => {
  try {
    return await listPeople();
  } catch (error) {
    throwPersonHttpError(error);
  }
});
