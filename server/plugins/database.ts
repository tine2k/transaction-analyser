// Registers the shutdown obligation the pool carries, so that stopping the
// server ends it rather than leaving connections open. The pool itself is built
// on first use in server/utils/db.ts; this plugin neither builds nor queries it.
//
// See openspec/changes/add-nuxt-application-shell/specs/backend-shell/spec.md
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', () => endDatabasePool());
});
