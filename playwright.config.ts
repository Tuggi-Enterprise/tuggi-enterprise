import { defineConfig, devices } from "@playwright/test";

// Fixed, non-default ports so this suite never collides with a `next dev`
// a human left running on 3000, or a local Supabase stack on the usual 54321.
// Exported because a spec talks to the double directly (reading back the rows
// the attribution route stored) — one declaration, not two.
export const MOCK_SUPABASE_PORT = 4010;
// Two keys, two values, and they differ only so a test can tell which
// environment variable a given code path read. The double never checks them —
// it records them, and supabase-key-boundary.spec.ts reads them back. Exported
// for the same reason as the port above: one declaration, not two.
export const E2E_PUBLISHABLE_KEY = "e2e-publishable-key";
export const E2E_SERVICE_ROLE_KEY = "e2e-service-role-key";
/**
 * The HMAC secret of the proposal's per-address counter. Exported for the same
 * reason as the two keys: the spec that drives the rate limit needs to know the
 * hash is stable, and a value invented in two places is a counter that never
 * recognises a repeat caller.
 */
export const E2E_PARTNER_FORM_HASH_SECRET = "e2e-partner-form-hash-secret";
/**
 * The shared secret that proves a request reached the origin through our own
 * Cloudflare edge (`src/lib/rate-limit.ts`, `EDGE_SECRET_VAR`). Set here so the
 * suite can drive both sides of the decision: a request that carries it in
 * `x-tuggi-edge` has its `CF-Connecting-IP` honoured, and one that does not is
 * read from `x-forwarded-for` no matter what it claims.
 */
export const E2E_EDGE_SHARED_SECRET = "e2e-edge-shared-secret";
const APP_PORT = 3100;
// ...and a build directory of its own, for the same reason. `next build` and
// `next dev` both own `.next/`: building the suite under a running dev server
// swaps the static chunks out from under it, every page stops hydrating, and
// the whole suite goes red with framer-motion opacity errors that look like a
// component defect. next.config.ts reads this via TUGGI_DIST_DIR.
// Exported for the same reason as the port and the keys above: the spec that
// reads the build's own prerender manifest (partner-og-static-params.spec.ts)
// has to look inside the directory this build wrote to.
export const DIST_DIR = ".next-e2e";

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
        // Both are required: src/lib/supabase-server.ts throws on a missing
        // one, so a build here fails exactly the way a deploy with a missing
        // Vercel variable would.
        SUPABASE_PUBLISHABLE_KEY: E2E_PUBLISHABLE_KEY,
        SUPABASE_SERVICE_ROLE_KEY: E2E_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_BASE_URL: `http://127.0.0.1:${APP_PORT}`,
        // The partnership proposal refuses every submission when this is unset —
        // fail closed, on purpose (src/lib/partner-proposal/proposal-service.ts).
        // A fixed value here so the hash of one address is stable across the run
        // and the double can count repeats the way the RPC does.
        PARTNER_FORM_HASH_SECRET: E2E_PARTNER_FORM_HASH_SECRET,
        // Unset, this would degrade to reading `x-forwarded-for` — safe, and
        // the suite would then be unable to prove the honoured half.
        TUGGI_EDGE_SHARED_SECRET: E2E_EDGE_SHARED_SECRET,
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
