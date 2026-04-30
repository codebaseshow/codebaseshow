import {defineConfig} from '@playwright/test';
import {FRONTEND_URL} from './ports';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  // Tests share state (DB, fake GitHub server), so they must run sequentially.
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: FRONTEND_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
});
