import { defineConfig, devices } from "@playwright/test";

// Fixed, non-default ports so this suite never collides with a `next dev`
// a human left running on 3000, or a local Supabase stack on the usual 54321.
const MOCK_SUPABASE_PORT = 4010;
const APP_PORT = 3100;
// ...and a build directory of its own, for the same reason. `next build` and
// `next dev` both own `.next/`: building the suite under a running dev server
// swaps the static chunks out from under it, every page stops hydrating, and
// the whole suite goes red with framer-motion opacity errors that look like a
// component defect. next.config.ts reads this via TUGGI_DIST_DIR.
const DIST_DIR = ".next-e2e";

/**
 * The suite runs against a local production build (`npm run build && npm run
 * start`), not `next dev` and not tuggi.app — see mock-supabase-server.mjs for
 * why the data layer is a local double rather than the real project.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/e2e/mock-supabase-server.mjs",
      url: `http://127.0.0.1:${MOCK_SUPABASE_PORT}/__health`,
      // APP_PORT: the welcome-audio fixture points back at the app's own
      // public/audio, so the double has to know where the app is listening.
      env: { MOCK_SUPABASE_PORT: String(MOCK_SUPABASE_PORT), APP_PORT: String(APP_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
      stdout: "pipe",
    },
    {
      command: `npm run build && npm run start -- -p ${APP_PORT}`,
      url: `http://127.0.0.1:${APP_PORT}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        // Points the app at the mock above instead of the real Supabase
        // project. Read at both build time (next.config.ts derives the
        // next/image remote-pattern host from this) and at request time
        // (src/lib/partner.ts).
        SUPABASE_URL: `http://127.0.0.1:${MOCK_SUPABASE_PORT}`,
        SUPABASE_SERVICE_ROLE_KEY: "e2e-test-key",
        NEXT_PUBLIC_BASE_URL: `http://127.0.0.1:${APP_PORT}`,
        TUGGI_DIST_DIR: DIST_DIR,
      },
      stdout: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
