// Creates a person from a JSON body naming its name. The name is trimmed, must not
// be empty, and must be distinct ignoring letter case. The created person carries a
// count of zero, and creating one creates, changes, or deletes no transaction.
//
// A body that cannot be read is reported as a refused request rather than as a
// server failure.
//
// See openspec/changes/add-people/specs/person-management-api/spec.md
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => undefined);
  try {
    const created = await createPerson(body);
    setResponseStatus(event, 201);
    return created;
  } catch (error) {
    throwPersonHttpError(error);
  }
});
