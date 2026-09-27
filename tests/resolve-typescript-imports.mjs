// Node's built-in TypeScript support does not resolve the extensionless relative
// imports used by Nuxt source files. Resolve those imports when running tests
// directly against the TypeScript source without changing production imports.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) {
      throw error;
    }
    return nextResolve(`${specifier}.ts`, context);
  }
}
