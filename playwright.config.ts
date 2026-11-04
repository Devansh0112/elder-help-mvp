import { defineConfig } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the installed Google Chrome, so no Playwright browser download is needed.
    // Set PW_CHANNEL= (empty) to use Playwright's bundled Chromium after `npx playwright install chromium`.
    channel: process.env.PW_CHANNEL ?? 'chrome',
    headless: true,
  },
  webServer: {
    command: `npm run reset && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/dashboard`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VOICE_PROVIDER: 'fake', DB_PATH: 'data/e2e.db', NEXT_TELEMETRY_DISABLED: '1' },
  },
});
