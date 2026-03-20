import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    // API tests only — no browser needed
  },
  projects: [
    {
      name: 'api',
      use: {},
    },
  ],
});
