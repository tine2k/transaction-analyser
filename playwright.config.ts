import { defineConfig } from '@playwright/test';

const systemChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'node_modules/.cache/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    ...(systemChromiumPath ? { launchOptions: { executablePath: systemChromiumPath } } : {}),
  },
  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      HOST: '127.0.0.1',
      PORT: '3000',
      DATABASE_URL: '',
    },
  },
});
