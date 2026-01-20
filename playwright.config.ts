import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: '.playwright-report', open: 'never' }],
    // Coverage reporter
    [
      'monocart-reporter',
      {
        coverage: {
          name: 'E2E Coverage Report',
          outputDir: '.coverage/e2e',
          reports: ['lcovonly', 'text'],
          sourceFilter: (sourcePath: string) => {
            return sourcePath.includes('/base/src/') || sourcePath.includes('/react/src/')
          },
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
})
