import { defineConfig, devices } from "@playwright/test";
import chromium from "@sparticuz/chromium";
const bundled = process.env.BUNDLED_CHROMIUM === "true";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm start",
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  projects: bundled
    ? [
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            launchOptions: {
              executablePath: await chromium.executablePath(),
              args: chromium.args.filter(
                (a) =>
                  ![
                    "--single-process",
                    "--in-process-gpu",
                    "--disable-web-security",
                    "--allow-running-insecure-content",
                    "--disable-site-isolation-trials",
                  ].includes(a),
              ),
            },
          },
        },
        {
          name: "mobile-chromium",
          use: {
            ...devices["Pixel 7"],
            launchOptions: {
              executablePath: await chromium.executablePath(),
              args: chromium.args.filter(
                (a) =>
                  ![
                    "--single-process",
                    "--in-process-gpu",
                    "--disable-web-security",
                    "--allow-running-insecure-content",
                    "--disable-site-isolation-trials",
                  ].includes(a),
              ),
            },
          },
        },
      ]
    : [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "safari", use: { ...devices["Desktop Safari"] } },
        { name: "iphone-safari", use: { ...devices["iPhone 13"] } },
        { name: "android-chrome", use: { ...devices["Pixel 7"] } },
      ],
});
