import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    include: ['tests/{unit,components,integration}/**/*.test.ts'],
    environment: 'nuxt',
    clearMocks: true,
    restoreMocks: true,
  },
});
