// The health endpoint. It reports on this server alone and never on the
// database, so a database that is unreachable is never presented as the
// application being down. It reads and writes nothing.
//
// See openspec/changes/add-nuxt-application-shell/specs/backend-shell/spec.md
export default defineEventHandler(() => ({ status: 'ok' }));
