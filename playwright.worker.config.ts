// Spike only (tuggi-app#686). Runs the existing e2e suite against the
// already-running Cloudflare Worker preview (`opennextjs-cloudflare preview`)
// and the already-running mock Supabase double, instead of `next start`.
// Not part of the production test config; deleted with the spike branch.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:8771",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
