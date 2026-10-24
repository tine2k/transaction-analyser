// Renames the person the identity names. The identity and every transaction that
// references it are unchanged; only the stored name changes. An unknown identity is
// a missing resource and a name another person already uses ignoring case is a
// conflict.
//
// See openspec/changes/add-people/specs/person-management-api/spec.md
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const body = await readBody(event).catch(() => undefined);
  try {
    return await renamePerson(id, body);
  } catch (error) {
    throwPersonHttpError(error);
  }
});
