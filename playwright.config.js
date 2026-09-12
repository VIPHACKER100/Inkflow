import { defineConfig } from '@playwright/test';

// E2E suite — formalizes the manual GUI test passes (gui-test-report.md).
// Browsers must be installed once per machine: npx playwright install chromium
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false, // the app keeps global state in one page
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5175', // dedicated port — 5173 is commonly taken by other dev servers
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { ...process.env, CI: 'true' }, // keep vite from opening a browser window
  },
});
