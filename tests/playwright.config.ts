import { defineConfig } from '@playwright/test';

const baseURL = process.env['APP_BASE_URL'] ?? 'http://127.0.0.1:43129';
const databaseUrl = process.env['TEST_DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database before running UI tests.');
}

export default defineConfig({
  testDir: '.',
  testMatch: ['category-list.spec.ts', 'category-match-count.spec.ts', 'transaction-filter.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'node .output/server/index.mjs',
    cwd: '..',
    url: `${baseURL}/api/health`,
    timeout: 30_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl,
      HOST: '127.0.0.1',
      PORT: new URL(baseURL).port || '80',
    },
  },
});
