import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,

  use: {
    baseURL: 'http://localhost:4000',
    // Capture screenshots on failure for easier debugging
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // Spin up `vite preview` (production build) before running E2E tests
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
