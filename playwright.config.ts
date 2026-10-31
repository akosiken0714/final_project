import { defineConfig, devices } from '@playwright/test';

// Cross-browser checks: three desktop engines (Chromium, Firefox, WebKit/Safari) and two phones.
// One-time setup:   npm i -D @playwright/test   then   npx playwright install
// Before running:   npm run build   (and make sure public/hot does not exist)
// Run:              npx playwright test              (add --project=mobile-safari to run one only)
// Report:           npx playwright show-report
// To test an already running site (for example a staging server) set E2E_BASE_URL and no server is started.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: external ?? 'http://127.0.0.1:8000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
        { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    ],
    webServer: external
        ? undefined
        : {
              command: 'php artisan serve --host=127.0.0.1 --port=8000',
              url: 'http://127.0.0.1:8000/up',
              reuseExistingServer: true,
              timeout: 60_000,
          },
});
