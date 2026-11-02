import { defineConfig, devices } from "@playwright/test";

/**
 * Accessibility e2e for the viewer: see e2e/README.md. Local only; it needs a
 * saved sandbox login and skips without one.
 */
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `https://localhost:${port}/`;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // The components come from the shared sandbox: keep the load modest.
  workers: Number(process.env.E2E_WORKERS ?? 3),
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    // The dev server's certificate is self-signed. It has to be https: the
    // components only allow https frame ancestors.
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "a11y", testMatch: /\.spec\.ts$/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "login", testMatch: /login\.setup\.ts$/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `yarn webpack serve --mode development --port ${port} --no-open --no-hot --no-client-overlay`,
        url: baseURL,
        ignoreHTTPSErrors: true,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
