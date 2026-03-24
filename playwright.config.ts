import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
  ],
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
